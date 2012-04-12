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

Job.prototype.setStatusHelper = function(status){
  var j = this;
  return function(callback){
    client.set(j.getPrefix()+':'+String(j._id)+':status', status, function(err, result){
      if(err) return callback(err);
      j.status = status;
      callback(err,result);
    });
  };
};

Job.prototype.setStatus = function(status, callback){
  var j = this;
  if(!this._id){
    this.getIndex(function(err, key_id){
      if(err) return callback(err);
      j._id = key_id;
      var hmset_option_1 = [
        j.getPrefix()+':'+String(j._id),
        'path',
        j.path,
        'payload',
        j.payload,
        'host',
        j.host,
        'port',
        j.port,
        'timeout',
        j.timeout,
        'receiver_id',
        j.receiver_id,
        'status',
        status
      ];
      client.hmset(hmset_option_1, callback);
    });
  } else {
    var hset_option_1 = [
      j.getPrefix()+':'+String(j._id),
      'status',
      status
    ];
    client.hset(hset_option_1, callback);
  }
};
