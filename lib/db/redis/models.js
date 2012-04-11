var util = require('util');
var EventEmitter = require('events').EventEmitter;
var client = require('./client');

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
  client.get(client.key_prefix+'_jobs_last_key', function(err,key_id){
    if(err){
      cb(err);
    } else {
      if(key_id == null){
        key_id = 0;
      } else {
        key_id++;
      }
      client.set(client.key_prefix+'_jobs_last_key' key_id);
      cb(null, key_id);
    }
  });
};

Job.prototype.setStatus = function(status, callback){
  var j = this;
  if(!this._id){
  } else {
  }
}
