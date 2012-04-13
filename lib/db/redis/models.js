var util = require('util');
var EventEmitter = require('events').EventEmitter;
var client = require('./client');
var async = require('async');
var _ = require('underscore');

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
  client.incr(this.getPrefix()+'_key', function(err,key_id){
    if(err) return cb(err);
    cb(null, key_id);
  });
};

Job.prototype.getPrefix = function(){
  return client.key_prefix+'_'+this.receiver_id+'_jobs';
}

Job.prototype.setJobAttributes = function(options, callback){
  var formatted_options = [this.getPrefix()+':'+String(this._id)];
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
    if(j.status != "overflow" && status == "overflow"){
      client.rpush(j.getPrefix()+'_overflow', j._id, function(err, result){
        if(err) return j.saveError(callback, err);
        postTransition();
      });
    } else if(j.status == "overflow" && status != "overflow"){
      client.lrem(j.getPrefix()+'_overflow', 1, j._id, function(err, result){
        if(err) return j.saveError(callback, err);
        postTransition();
      });
    } else {
      postTransition();
    }
    function postTransition(){
      j.status = status;
      j.emit('job_saved');
      if(callback) callback(null, result);
    }
  };
};

Job.prototype.saveError = function(callback, error){
  this.emit('job_save_error');
  if(callback) return callback(error);
}

Job.prototype.setStatus = function(status, callback){
  var j = this;
  if(!this._id){
    this.getIndex(function(err, key_id){
      if(err) return j.saveError(callback, err);
      j._id = key_id;
      var job_attributes = {
        path: j.path,
        payload: j.payload,
        host: j.host,
        port: j.port,
        timeout: j.timeout,
        receiver_id: j.receiver_id,
        status: status
      };
      j.setJobAttributes(job_attributes, j.setStatusCallback(status, callback));
    });
  } else {
    var job_attributes = {
      status: status
    };
    j.setJobAttributes(job_attributes, j.setStatusCallback(status, callback));
  }
};
