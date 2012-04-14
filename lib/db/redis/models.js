var util = require('util');
var EventEmitter = require('events').EventEmitter;
var client = require('./client');
var async = require('async');
var _ = require('underscore');

var kp = client.key_prefix;

var Job = function(options){
  this.path = options.path;
  this.payload = options.payload;
  this.host = options.host;
  this.port = options.port;
  this.timeout = options.timeout;
  this.receiver_id = options.receiver_id;
  this._id = options._id;
}

util.inherits(Job, EventEmitter);

exports.Job = Job;

Job.prototype.getIndex = function(cb){
  client.incr(kp+'_jobs_key', function(err,key_id){
    if(err) return cb(err);
    cb(null, key_id);
  });
};

Job.prototype.createJob = function(callback, override){
  override = override || {};
  var j = this;
  this.getIndex(function(err, key_id){
    if(err) return j.saveError(callback, err);
    j._id = key_id;
    var job_attributes = {
      path: override.path || j.path,
      payload: override.payload || j.payload,
      host: override.host || j.host,
      port: override.port || j.port,
      timeout: override.timeout || j.timeout,
      receiver_id: override.receiver_id || j.receiver_id,
      status: override.status || j.status
    };
    client.sadd(kp+'_receiver:'+j.receiver_id+':jobs', key_id, function(err){
      if(err) return j.saveError(callback, err);
      j.setJobAttributes(job_attributes, callback);
    });
  });
};

Job.prototype.setJobAttributes = function(options, callback){
  var formatted_options = [kp+'_jobs:'+this._id];
  _.each(options, function(option, i){
    formatted_options.push(i);
    formatted_options.push(option);
  });
  client.hmset(formatted_options, callback);
};

Job.prototype.setStatusCallback = function(status, callback){
  var j = this;
  return function(err, result){
    if(err) return j.saveError(callback, err);
    j.updateReceiverLists(status, function(err, callback){
      if(err) return j.saveError(callback, err);
      postTransition();
    });
    function postTransition(){
      j.status = status;
      j.emit('job_saved');
      if(callback) callback(null, result);
    }
  };
};

Job.prototype.updateReceiverLists = function(status, callback){
  var j = this;
  var updates = [];
  //transition to or from overflow
  if(j.status != "overflow" && status == "overflow"){
    updates.push(function(done){
      client.rpush(kp+'_receiver:'+j.receiver_id+':jobs_overflow', j._id, function(err, result){
        if(err) return callback(err);
        done();
      });
    });
  } else if(j.status == "overflow" && status != "overflow"){
    updates.push(function(done){
      client.lrem(kp+'_receiver:'+j.receiver_id+':jobs_overflow', 1, j._id, function(err, result){
        if(err) return callback(err);
        done();
      });
    });
  }
  //transition to or from queued
  if(j.status != "queued" && status == "queued"){
    updates.push(function(done){
      client.rpush(kp+'_receiver:'+j.receiver_id+':jobs_queued', j._id, function(err, result){
        if(err) return callback(err);
        done();
      });
    });
  } else if(j.status == "queued" && status != "queued"){
    updates.push(function(done){
      client.lrem(kp+'_receiver:'+j.receiver_id+':jobs_queued', 1, j._id, function(err, result){
        if(err) return callback(err);
        done();
      });
    });
  }
  async.parallel(updates, function(err){
    if(err) return callback(err);
    callback();
  });
};

Job.prototype.saveError = function(callback, error){
  this.emit('job_save_error');
  if(callback) return callback(error);
}

Job.prototype.setStatus = function(status, callback){
  if(!this._id){
    this.createJob(this.setStatusCallback(status, callback), {status: status});
  } else {
    this.setJobAttributes({status: status}, this.setStatusCallback(status, callback));
  }
};
