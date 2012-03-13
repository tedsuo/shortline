var _ = require('underscore');
var db = require('../db/adapter');
var async = require('async');
var job_processor = require('../../job_processor');
var job_processor = require('./job_processor');
var environment = require('../environment')(process.env.NODE_ENV);

var JobBoard = function(){
  this.queues = {};
}

module.exports = JobBoard;

JobBoard.prototype.load_receivers = function(cb){
  var jb = this;
  db.find_receiver({}, function(err, receivers){
    if(err) return cb(err);
    _.each(receivers, function(receiver){
      if(!jb.queues[receiver.name]){
        jb.queues[receiver.name] = new job_processor(receiver);
      }
    });
    cb(null,jb.queues);
  });
};

JobBoard.prototype.find_receiver_by_name = function(name,cb) {
  var jb = this;
  if(jb[name]){
    cb(null, this.queues[name]);
  } else {
    db.find_receiver_by_name(name, function(err, receiver){
      if(err) return cb(err);
      jb.queues[receiver.name] = new job_processor(receiver);
      cb(null, jb.queues[receiver.name]);
    });
  }
};

JobBoard.prototype.count_receivers = function(){
  return Object.keys(this.queues).length;
};

JobBoard.prototype.add_receiver = function(o,cb){
  var jb = this;
  db.add_receiver(o,function(err,receiver){
    jb.queues[receiver.name] = new job_processor(receiver);    
    cb(null, jb.queues[receiver.name]);
  });
};

JobBoard.prototype.update_receiver = function(){
  return db.update_receiver(arguments);
};

JobBoard.prototype.remove_receiver = function(){
  return db.remove_receiver(arguments);
};

// paths
JobBoard.prototype.add_path = function(){
  return db.add_path(arguments);
};
JobBoard.prototype.update_path = function(){
  return db.update_path(arguments);
};
JobBoard.prototype.remove_path = function(){
  return db.remove_path(arguments);
};

// jobs
JobBoard.prototype.find_jobs_by_receiver_id = function(){
  return db.find_jobs_by_receiver_id(arguments);
};
JobBoard.prototype.find_jobs_by_receiver_name = function(){
  return db.find_jobs_by_receiver_name(arguments);
};
JobBoard.prototype.create_job = function(){
  return db.create_job(arguments);
};

// empty db
JobBoard.prototype.remove_all = function(cb){
  this.queues = {};
  return db.remove_all(cb);
};

