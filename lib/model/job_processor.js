var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var _ = require('underscore');
var async = require('async');
var adapter = require('../db/adapter');
var path = require('path');
var log = require(path.normalize(__dirname__+'../log'));

// # JobProcessor
// 

var JobProcessor = function(receiver){

  this.id = null;
  this.concurrent_connections = 0;
  this.queue = [];
  this.state = "open";
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

// ### States
JobProcessor.states = [
  'open',
  'draining',
  'refilling'
];

JobProcessor.transitions = [
  ['open','refilling'],
  ['draining','refilling'],
  ['refilling','draining']
];

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

JobProcessor.prototype.push = function(job){
  if(this.is_queue_open()){
    job.setStatus("queued");
    if(this.at_max_concurrency()){
      this.process_job(job);
    } else {
      this.queue.push(job);
      if(this.is_queue_full()){
        log.info('R '+this.name+': state switched to draining');
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
  log.info('R '+this.name+': queue length is '+this.queue.length);
  log.info('R '+this.name+': state is '+ this.state);
};

JobProcessor.prototype.at_max_concurrency = function(){
  return this.concurrent_connections < this.concurrency;
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
  return this.max_queue <= this.queue.length ? true : false;
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
  log.info('R '+this.name+': initializing');
  var jp = this;
  adapter.find_jobs_by_receiver_id(jp.id, {statuses: ['overflow', 'queued']}, function(err, jobs){
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

// Refill the queue from db, in the order the jobs were created
JobProcessor.prototype.refill_queue = function(){
  var jp = this;
  log.info('R '+this.name+': state switched to refilling');
  this.state = "refilling";
  adapter.find_jobs_by_receiver_id(jp.id, {statuses: ['overflow'], limit: jp.refill_size}, function(err, jobs){
    log.info('R '+jp.name+': retreived ' + jobs.length + " jobs from db");

    var job_save_states = [];
    var job_queues = [];
    _.each(jobs, function(job){
      job_save_states.push(function(done){
        job.setStatus("queued", done);
      });
      job_queues.push(function(done){
        if(jp.concurrent_connections < jp.concurrency && jp.queue.length == 0){
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
          log.info('R '+jp.name+': state switched to open');
          jp.state = "open";
        } else {
          log.info('R '+jp.name+': state switched to draining');
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
    req.on('error', function(){});
    job.setStatus("timeout");
    log.info('R '+jp.name+': J '+job._id+' > Timeout!');
    req.abort();
    jp.emit('job_finished');
  }, job.timeout);
};

module.exports = JobProcessor;
