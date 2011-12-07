var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var models = require('./models');
var _ = require('underscore');
var async = require('async');

var JobProcessor = function(receiver){
  this.concurrent_connections = 0;
  this.queue = [];
  this.max_queue = receiver.concurrency * 10;
  // Refill size should be half the max_queue size
  this.refill_size = receiver.concurrency * 5;
  this.receiver = receiver;
  this.state = "open";
  console.log('state: open');

  // Node 0.6
  var httpAgent = new http.Agent();
  // Node 0.4
  //var httpAgent = http.getAgent(host, port);
  httpAgent.maxSockets = receiver.concurrency;
  this.options = {
    host: receiver.host,
    agent: httpAgent,
    port: receiver.port,
    method: 'POST'
  };

  this.on('job_finished', this.handle_job_finished);
};

util.inherits(JobProcessor, EventEmitter);

JobProcessor.prototype.push = function(job){
  if(this.is_queue_open()){
    job.setStatus("queued");
    if(this.concurrent_connections < this.receiver.concurrency){
      this.process_job(job);
    } else {
      this.queue.push(job);
      if(this.max_queue == this.queue.length){
        console.log('state switched to draining');
        this.state = "draining";
      }
    }
  } else if(this.is_queue_draining()) {
    job.setStatus("overflow");
  } else if(this.is_queue_refilling()){
    // TODO: Optimize this line: may be faster not to save it
    job.setStatus("buffering");
    this.on('refilling_finished', function(){
      this.push(job);
    });
  }
  console.log('queue length: ', this.queue.length);
  console.log('state: ', this.state);
};

JobProcessor.states = [
  'draining',
  'refilling',
  'open'
];

_.each(JobProcessor.states, function(state){
  JobProcessor.prototype['is_queue_'+state] = function(){
    return this.state == state;
  };
});

JobProcessor.prototype.is_queue_full = function(){
  return this.queue.length < this.max_queue ? false : true;
};

JobProcessor.prototype.can_queue_refill = function(){
  return this.queue.length + this.refill_size <= this.max_queue ? true : false;
};

JobProcessor.prototype.handle_job_finished = function(){
  this.concurrent_connections--;
  this.process_queue();
};

JobProcessor.prototype.process_queue = function(){
  if(this.queue.length > 0){
    var job = this.queue[0];
    this.queue = this.queue.slice(1, this.queue.length);
    if(this.is_queue_draining() && this.can_queue_refill()){
      this.refill_queue();
    }
    this.process_job(job);
  }
};

JobProcessor.prototype.initialize_queue = function(){
};

// Refill the queue from mongo, in the order the jobs were created
JobProcessor.prototype.refill_queue = function(){
  var jp = this;
  console.log('state switched to refilling');
  this.state = "refilling";
  var q = models.Job.find({
    status: "overflow",
    'receiver._id': jp.receiver._id
  }).sort('created', 'ascending').limit(this.refill_size);
  q.execFind(function(err, jobs){
    console.log("retreived " + jobs.length + " jobs from mongo");
    var job_functions = [];
    _.each(jobs, function(job){
      job_functions[job_functions.length] = function(done){
        jp.queue.push(job);
        job.status = "queued";
        job.save(function(err){
          if(err){
            done(err);
          } else {
            done();
          }
        })
      };
    });
    async.parallel(
      job_functions,
      function(err){
        if(jobs.length < jp.refill_size){
          console.log('state switched to open');
          jp.state = "open";
        } else {
          console.log('state switched to draining');
          jp.state = "draining";
        }
        jp.emit('refilling_finished');
      }
    );
  });
}

JobProcessor.prototype.process_job = function(job){
  var jp = this;
  this.concurrent_connections++;
  var options = _.extend({path: '/'+job.path}, this.options);
  var timeout_task;
  console.log('Processing Job id: '+ job._id);

  // Make a request to the endpoint
  var req = http.request(options, function(res){
    res.on('data', function(chunk){
      console.log('Body for '+job._id+': '+chunk);
    });
    res.on('end', function(){
      console.log('Response code for '+job._id+': '+res.statusCode);
      clearTimeout(timeout_task);
      if(res.statusCode == 200){
        job.setStatus("complete");
      } else {
        job.setStatus("failed");
      }
      jp.emit('job_finished');
    });
  });
  req.write(job.payload);
  req.end();

  // Handle errors and timeouts
  req.on('error', function(err){
    clearTimeout(timeout_task);
    job.setStatus("error");
    console.log('Error: '+err.message);
    jp.emit('job_finished');
  });
  timeout_task = setTimeout(function(){
    req.removeAllListeners('error');
    req.on('error', function(){});
    job.setStatus("timeout");
    console.log("Timeout!");
    req.abort();
    jp.emit('job_finished');
  }, job.timeout);
};

module.exports = JobProcessor;
