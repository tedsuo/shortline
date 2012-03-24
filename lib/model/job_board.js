var _ = require('underscore');
var db = require('../db/adapter');
var async = require('async');
var job_processor = require('./job_processor');
var environment = require('../environment')(process.env.NODE_ENV);
var config = require('../config');

var JobBoard = function(){
  this.queues = {};
}

module.exports = JobBoard;

JobBoard.prototype.push = function(o,cb){
  if(!o.receiver) return cb(new Error('missing require parameter "receiver"'));
  if(!o.path) return cb(new Error('missing require parameter "path"'));

  var jb = this;
  jb.get_path(o.receiver,o.path,function(err,path,receiver){
    if(err) return cb(err);
    
    o.receiver_id = receiver.id;
    o.path = path.url;
    o.host = receiver.host;
    o.port = receiver.port || config.default_receiver_port;
    o.timeout = path.timeout || config.default_receiver_timeout;

    jb.create_job(o, function(err,job){
      if(err) return cb(err);
      receiver.push(job);
      cb(null,job);
    });
  });
}

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

JobBoard.prototype.count_receivers = function(){
  return Object.keys(this.queues).length;
};

JobBoard.prototype.get_receiver = function(name,cb) {
  if(this[name]) return cb(null, this.queues[name]);

  var jb = this;
  db.find_receiver_by_name(name, function(err, receiver){
    if(err) return cb(err);
    jb.queues[receiver.name] = new job_processor(receiver);
    cb(null, jb.queues[receiver.name]);
  });
};

JobBoard.prototype.add_receiver = function(o,cb){
  var jb = this;
  db.add_receiver(o,function(err,receiver){
    jb.queues[receiver.name] = new job_processor(receiver);    
    cb(null, jb.queues[receiver.name]);
  });
};

JobBoard.prototype.update_receiver = function(name,o,cb){
  var jb = this;
  jb.get_receiver(name,function(err,queue){
    if(err) return cb(err);
    db.update_receiver(name,o,function(err,receiver){
      if(err) return cb(err);
      if(jb.queues[name]){
        if(name !== receiver.name){
          jb.queues[receiver.name] = jb.queues[name];
          delete jb.queues[name];
        }
        jb.queues[receiver.name].update(receiver);
      }
      cb(null,jb.queues[receiver.name]);
    });
  });
};


JobBoard.prototype.remove_receiver = function(name,cb){
  delete this.queues[name];
  db.remove_receiver(name,cb);
};

// paths
JobBoard.prototype.add_path = function(receiver_name, options, cb){
  var jb = this;
  db.add_path(receiver_name, options, function(err,path){
    if(err) return cb(err);
    jb.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      receiver.update({paths: [path]});
      cb(null,path);
    });
  });
};

JobBoard.prototype.update_path = function(receiver_name,path_name,updates,cb){
  var jb = this;
  db.update_path(receiver_name,path_name,updates,function(err,new_path){
    if(err) return cb(err);
    jb.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      receiver.update({paths: [new_path]});
      cb(null,new_path);
    });
  });
};

JobBoard.prototype.remove_path = function(receiver_name,path_name,cb){
  db.remove_path(receiver_name,path_name,cb);
};

JobBoard.prototype.get_path = function(receiver_name,path_name,cb){
  this.get_receiver(receiver_name,function(err,receiver){
    if(err) return cb(err);
    var path = _.detect(receiver.paths,function(path){
      return path.name === path_name;
    });
    if(path) cb(null,path,receiver);
    else cb(new Error('Path not found'));
  });
};

// jobs
JobBoard.prototype.find_jobs_by_receiver_id = function(receiver_id, o, cb){
  o = o || {};
  o.limit = o.limit || 50;
  db.find_jobs_by_receiver_id(receiver_id, o, cb);
};

JobBoard.prototype.find_jobs_by_receiver_name = function(receiver_name, o, cb){
  db.find_jobs_by_receiver_name(receiver_name, o, cb);
};

JobBoard.prototype.create_job = function(job,cb){
  db.create_job(job,cb);
};

JobBoard.prototype.get_job = function(job_id,cb){
  db.get_job(job_id,cb);
};

// empty db
JobBoard.prototype.remove_all = function(cb){
  this.queues = {};
  db.remove_all(cb);
};