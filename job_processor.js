var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var _ = require('underscore');
var async = require('async');
var adapter = require('./adapter');

var JobProcessor = function(receiver){
  this.concurrent_connections = 0;
  this.queue = [];
  this.max_queue = receiver.concurrency * 10;
  // Refill size should be half the max_queue size
  this.refill_size = receiver.concurrency * 5;
  this.receiver = receiver;

  this.state = "open";

  // Node 0.6
  var httpAgent = new http.Agent();
  // Node 0.4
  //var httpAgent = http.getAgent(host, port);
  httpAgent.maxSockets = receiver.concurrency;
  this.options = {
    agent: httpAgent,
    port: receiver.port,
    method: 'POST'
  };

  if(receiver.ip){
    this.options.host = receiver.ip;
    this.options.headers = {
      Host: receiver.host
    };
  } else {
    this.options.host = receiver.host;
  }

  this.on('job_finished', this.handle_job_finished);

  console.log('R '+this.receiver.name+': initializing');
  this.initialize_queue();
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
        console.log('R '+this.receiver.name+': state switched to draining');
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
  console.log('R '+this.receiver.name+': queue length is '+this.queue.length);
  console.log('R '+this.receiver.name+': state is '+ this.state);
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
  var jp = this;
  adapter.find_jobs_by_receiver_id(jp.receiver._id, {statuses: ['overflow', 'queued']}, function(err, jobs){
    _.each(jobs, function(job){
      jp.push(job);
    });
  });
};

// Refill the queue from db, in the order the jobs were created
JobProcessor.prototype.refill_queue = function(){
  var jp = this;
  console.log('R '+this.receiver.name+': state switched to refilling');
  this.state = "refilling";
  adapter.find_jobs_by_receiver_id(jp.receiver._id, {statuses: ['overflow'], limit: this.refill_size}, function(err, jobs){
    console.log('R '+jp.receiver.name+': retreived ' + jobs.length + " jobs from db");

    var job_save_states = [];
    var job_queues = [];
    _.each(jobs, function(job){
      job_save_states.push(function(done){
        job.setStatus("queued", done);
      });
      job_queues.push(function(done){
        if(jp.concurrent_connections < jp.receiver.concurrency && jp.queue.length == 0){
          // all queued jobs finished while fetching from db, and then some
          jp.process_job(job);
        } else {
          jp.queue.push(job);
        }
      });
    });
    async.parallel(
      job_save_states,
      function(err){
        if(jobs.length < jp.refill_size){
          console.log('R '+jp.receiver.name+': state switched to open');
          jp.state = "open";
        } else {
          console.log('R '+jp.receiver.name+': state switched to draining');
          jp.state = "draining";
        }
        _.each(job_queues, function(job_queue){
          job_queue();
        });
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
  console.log('R '+this.receiver.name+': J '+job._id+' > Processing');

  // Make a request to the endpoint
  var req = http.request(options, function(res){
    res.on('end', function(){
      console.log('R '+jp.receiver.name+': J '+job._id+' > Response Code: '+res.statusCode);
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
    console.log('R '+jp.receiver.name+': J '+job._id+' > Error: '+err.message);
    jp.emit('job_finished');
  });
  timeout_task = setTimeout(function(){
    req.removeAllListeners('error');
    req.on('error', function(){});
    job.setStatus("timeout");
    console.log('R '+jp.receiver.name+': J '+job._id+' > Timeout!');
    req.abort();
    jp.emit('job_finished');
  }, job.timeout);
};

module.exports = JobProcessor;
