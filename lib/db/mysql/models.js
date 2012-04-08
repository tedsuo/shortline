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

Job.prototype.setStatus = function(status, callback){
  var j = this;
  if(!this._id){
    client.query(
      "INSERT INTO `jobs` (`path`, `payload`, `host`, `port`, `timeout`, `receiver_id`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [this.path, this.payload, this.host, this.port, this.timeout, this.receiver_id, status],
      function(error, result){
        if(error){
          j.emit('job_save_error');
          if(callback) callback(error);
        } else {
          j._id = result.insertId;
          j.status = status;
          j.emit('job_saved');
          if(callback) callback(null, result);
        }
      }
    );
  } else {
    client.query("UPDATE `jobs` SET `status` = ? WHERE `_id` = ?", [status, this._id], function(error, results){
      if(error){
        j.emit('job_save_error');
        if(callback) callback(error);
      } else {
        j.status = status;
        j.emit('job_saved');
        if(callback) callback(null, results);
      }
    });
  }
}
