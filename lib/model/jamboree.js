var _ = require('underscore');
var db = require('../db/adapter');
var async = require('async');
var job_processor = require('./job_processor');
var environment = require('../environment')(process.env.NODE_ENV);
var config = require('../config');
var path = require('path');
var log = require(path.normalize(__dirname+'/../log'));

var Jamboree = function(){
  this.queues = {};
}

module.exports = Jamboree;

Jamboree.prototype.push = function(o,cb){
  if(!o.receiver) return cb(new Error('missing require parameter "receiver"'));
  if(!o.path) return cb(new Error('missing require parameter "path"'));

  var jb = this;
  jb.get_path(o.receiver,o.path,function(err,path,receiver){
    if(err) return cb(err);
    
    var create_job_options = _.clone(o);
    delete create_job_options.receiver;
    create_job_options.receiver_id = receiver.id;
    create_job_options.path = path.url;
    create_job_options.host = receiver.host;
    create_job_options.port = receiver.port || config.default_receiver_port;
    create_job_options.timeout = path.timeout || config.default_receiver_timeout;

    jb.create_job(create_job_options, function(err,db_resp, job){
      if(err) return cb(err);
      receiver.push(job);
      cb(null,job);
    });
  });
}

Jamboree.prototype.load_receivers = function(cb){
  var jb = this;
  log.info('loading receivers');
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

Jamboree.prototype.count_receivers = function(){
  return Object.keys(this.queues).length;
};

Jamboree.prototype.get_receiver = function(name,cb) {
  if(this.queues[name]) return cb(null, this.queues[name]);
  var jb = this;
  db.find_receiver_by_name(name, function(err, receiver){
    if(err) return cb(err);
    jb.queues[receiver.name] = new job_processor(receiver);
    cb(null, jb.queues[receiver.name]);
  });
};

Jamboree.prototype.add_receiver = function(o,cb){
  var jb = this;
  db.add_receiver(o,function(err,db_resp){
    var retval = _.extend({_id: db_resp[db.id]}, o);
    retval._id = db_resp[db.id];
    jb.queues[retval.name] = new job_processor(retval);    
    cb(null, jb.queues[retval.name]);
  });
};

Jamboree.prototype.update_receiver = function(name,o,cb){
  var jb = this;
  jb.get_receiver(name,function(err,queue){
    if(err) return cb(err);
    db.update_receiver(name,o,function(err,receiver){
      if(err) return cb(err);
      if(jb.queues[name]){
        if(o.name && name !== o.name){
          jb.queues[o.name] = jb.queues[name];
          delete jb.queues[name];
          name = o.name;
        }
        jb.queues[name].update(o);
      }
      cb(null,jb.queues[name]);
    });
  });
};


Jamboree.prototype.remove_receiver = function(name,cb){
  delete this.queues[name];
  db.remove_receiver(name,cb);
};

// paths
Jamboree.prototype.add_path = function(receiver_name, options, cb){
  var jb = this;
  db.add_path(receiver_name, options, function(err,db_resp){
    if(err) return cb(err);
    var retval = _.extend({_id: db_resp[db.id]}, options);
    jb.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      receiver.update({paths: [retval]});
      cb(null,retval);
    });
  });
};

Jamboree.prototype.update_path = function(receiver_name,path_name,updates,cb){
  var jb = this;
  db.update_path(receiver_name,path_name,updates,function(err, db_resp){
    if(err) return cb(err);
    jb.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      // TODO: delete old path on receiver
      receiver.update({paths: [updates]});
      cb(null,updates);
    });
  });
};

Jamboree.prototype.remove_path = function(receiver_name,path_name,cb){
  var jb = this;
  db.remove_path(receiver_name,path_name,function(err){
    jb.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      delete receiver.paths[path_name];
      cb(null);
    });
  });
};

Jamboree.prototype.get_path = function(receiver_name,path_name,cb){
  this.get_receiver(receiver_name,function(err,receiver){
    if(err) return cb(err);
    var path = receiver.paths[path_name];
    if(path) cb(null,path,receiver);
    else cb(new Error('Path not found'));
  });
};

// jobs
Jamboree.prototype.find_jobs_by_receiver_id = function(receiver_id, o, cb){
  o = o || {};
  o.limit = o.limit || 50;
  db.find_jobs_by_receiver_id(receiver_id, o, cb);
};

Jamboree.prototype.find_jobs_by_receiver_name = function(receiver_name, o, cb){
  o = o || {};
  db.find_jobs_by_receiver_name(receiver_name, o, cb);
};

Jamboree.prototype.create_job = function(options,cb){
  db.create_job(options,function(err, db_resp, job){
    if(err){
      cb(err);
    } else {
      var response = _.extend({_id: db_resp[db.id]}, options);
      cb(null, response, job);
    }
  });
};

Jamboree.prototype.get_job = function(job_id,cb){
  db.get_job(job_id,cb);
};

// empty db
Jamboree.prototype.remove_all = function(cb){
  this.queues = {};
  db.remove_all(cb);
};
