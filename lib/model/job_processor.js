var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var _ = require('underscore');
var async = require('async');
var db = require('../db/adapter');
var path = require('path');
var log = require(path.normalize(__dirname+'/../log'));

// # JobProcessor
// 

var JobProcessor = function(receiver){
  this.id = null;
  this.concurrent_connections = 0;
  this.queue = [];
  this.refill_buffer = [];
  this.state = "open";
  this.overflow_count = 0;
  this.httpAgent = new http.Agent();
  this.port = 80;
  this.paths = {};
  this.ip = null;
  this.set_concurrency(5);

  this.on('job_finished', this.handle_job_finished);
  
  this.update(receiver);
  this.initialize_queue();
};

util.inherits(JobProcessor, EventEmitter);

module.exports = JobProcessor;

// ### States
JobProcessor.states = [
  'open',
  'draining',
  'refilling'
];

JobProcessor.transitions = [
  ['open','draining'],
  ['draining','refilling'],
  ['refilling','draining']
];

JobProcessor.prototype.change_state = function(new_state){
  if(this.state == new_state) return;
  var old_state = this.state;
  this.state = new_state;
  log.info('R '+this.name+': STATE CHANGE '+old_state+' -> '+new_state);
};

JobProcessor.prototype.update = function(receiver){
  if(receiver._id) this.id = receiver._id;
  if(receiver.name) this.name = receiver.name;
  if(receiver.host) this.host = receiver.host;
  if(receiver.port) this.port = receiver.port;
  if(receiver.ip) this.ip = receiver.ip;
  if(receiver.paths) this.set_paths(receiver.paths);
  if(receiver.concurrency) this.set_concurrency(receiver.concurrency);

  this.initialize_options();
}

JobProcessor.prototype.initialize_options = function(){
  this.options = {
    agent: this.httpAgent,
    host: this.host,
    port: this.port,
    method: 'POST'
  };

  if(this.ip){
    this.options.host = this.ip;
    this.options.headers = {
      Host: this.host
    };
  }
};

JobProcessor.prototype.initialize_queue = function(){
  log.info('R '+this.name+': initializing');
  var jp = this;
  db.find_jobs_by_receiver_id(jp.id, {statuses: ['overflow', 'queued']}, function(err, jobs){
    if(err){
      log.error('R '+this.name+': error initializing jobs');
      log.error(err);
      return;
    }
    _.each(jobs, function(job){
      jp.push(job);
    });
  });
};

JobProcessor.prototype.set_paths = function(paths){
  _.each(paths,function(path){
    this.paths[path.name] = path;
  },this);
};

JobProcessor.prototype.set_concurrency = function(concurrency){
  // Refill size should be half the max_queue size
  this.max_queue = concurrency * 10;
  this.refill_size = concurrency * 5;
  this.httpAgent.maxSockets = concurrency;
  this.concurrency = concurrency;
};

JobProcessor.prototype.push = function(job){
  var jp = this;
  if(this.is_queue_open()){
    this.push_to_queue(job);
  } else if(this.is_queue_draining() || this.is_queue_refilling()) {
    ++this.overflow_count;
    log.info('R '+this.name+': overflow_count is '+ this.overflow_count);
    job.setStatus("overflow", function(){});
  }
  log.info('R '+this.name+': queue length is '+this.queue.length);
  log.info('R '+this.name+': state is '+ this.state);
};

JobProcessor.prototype.push_to_queue = function(job){
  if(!this.at_max_concurrency()){
    this.process_job(job);
  } else {
    this.queue.push(job);
    if(this.is_queue_full()){
      this.change_state("draining");
    }
  }
}

JobProcessor.prototype.at_max_concurrency = function(){
  return this.concurrent_connections >= this.concurrency;
};

JobProcessor.prototype.is_queue_open = function(){
  return this.state == 'open';
};

JobProcessor.prototype.is_queue_draining = function(){
  return this.state == 'draining';
};

JobProcessor.prototype.is_queue_refilling = function(){
  return this.state == 'refilling';
};

JobProcessor.prototype.is_queue_full = function(){
  return this.queue.length >= this.max_queue ? true : false;
};

JobProcessor.prototype.should_queue_refill = function(){
  return this.is_queue_draining() && (this.queue.length === this.refill_size);
};

JobProcessor.prototype.handle_job_finished = function(){
  this.concurrent_connections--;
  this.process_queue();
};

JobProcessor.prototype.process_queue = function(){
  if(this.queue.length > 0){
    var job = this.queue[0];
    this.queue = this.queue.slice(1, this.queue.length);
    if(this.should_queue_refill()){
      this.refill_queue();
    }
    this.process_job(job);
  }
};

// Refill the queue from db, in the order the jobs were created
JobProcessor.prototype.refill_queue = function(){
  var jp = this;
  
  this.change_state("refilling");

  db.find_jobs_by_receiver_id(jp.id, {statuses: ['overflow'], limit: (jp.max_queue)}, function(err, jobs){
    log.info('R '+jp.name+': retreived ' + jobs.length + " jobs from db");

    var tasks = _.map(jobs, function(job){
      return function(done){
        job.setStatus("queued", done);
      };
    });
    
    jp.overflow_count = jp.overflow_count - jobs.length;

    async.parallel(
      tasks,
      function(err){
        log.info('R '+jp.name+': refill complete ' + jp.overflow_count + " in overflow");
        jobs.forEach(function(job){
          jp.push_to_queue(job);
        })
        if(jp.overflow_count > 0){
          jp.refill_queue();
        } else {
          jp.change_state("open");
        }
      }
    );
  });
}

JobProcessor.prototype.process_job = function(job){
  var jp = this;
  this.concurrent_connections++;
  var options = _.extend({path: '/'+job.path}, this.options);
  var timeout_task;
  log.info('R '+this.name+': J '+job._id+' > Processing');

  // Make a request to the endpoint
  var req = http.request(options, function(res){
    res.on('end', function(){
      log.info('R '+jp.name+': J '+job._id+' > Response Code: '+res.statusCode);
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
    log.info('R '+jp.name+': J '+job._id+' > Error: '+err.message);
    jp.emit('job_finished');
  });

  timeout_task = setTimeout(function(){
    req.removeAllListeners('error');
    // make sure req does not throw
    req.on('error', function(){});
    job.setStatus("timeout");
    log.info('R '+jp.name+': J '+job._id+' > Timeout!');
    req.abort();
    jp.emit('job_finished');
  }, job.timeout);
};
