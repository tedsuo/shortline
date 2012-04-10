var _ = require('underscore');
var db = require('../db/adapter');
var async = require('async');
var job_processor = require('./job_processor');
var environment = require('../environment')(process.env.NODE_ENV);
var config = require('../config');
var path = require('path');
var log = require(path.normalize(__dirname+'/../log'));

var Shortline = function(){
  this.queues = {};
}

module.exports = Shortline;

Shortline.prototype.push = function(o,cb){
  if(!o.receiver) return cb(new Error('missing require parameter "receiver"'));
  if(!o.path) return cb(new Error('missing require parameter "path"'));

  var short = this;
  short.get_path(o.receiver,o.path,function(err,path,receiver){
    if(err) return cb(err);
    
    var create_job_options = _.clone(o);
    delete create_job_options.receiver;
    create_job_options.receiver_id = receiver.id;
    create_job_options.path = path.url;
    create_job_options.host = receiver.host;
    create_job_options.port = receiver.port || config.default_receiver_port;
    create_job_options.timeout = path.timeout || config.default_receiver_timeout;

    short.create_job(create_job_options, function(err,db_resp, job){
      if(err) return cb(err);
      receiver.push(job);
      cb(null,job);
    });
  });
}

Shortline.prototype.load_receivers = function(cb){
  var short = this;
  log.info('loading receivers');
  db.find_receiver({}, function(err, receivers){
    if(err) return cb(err);
    _.each(receivers, function(receiver){
      if(!short.queues[receiver.name]){
        short.queues[receiver.name] = new job_processor(receiver);
      }
    });
    cb(null,short.queues);
  });
};

Shortline.prototype.count_receivers = function(){
  return Object.keys(this.queues).length;
};

Shortline.prototype.get_receiver = function(name,cb) {
  if(this.queues[name]) return cb(null, this.queues[name]);
  var short = this;
  db.find_receiver_by_name(name, function(err, receiver){
    if(err) return cb(err);
    short.queues[receiver.name] = new job_processor(receiver);
    cb(null, short.queues[receiver.name]);
  });
};

Shortline.prototype.add_receiver = function(o,cb){
  var short = this;
  db.add_receiver(o,function(err,db_resp){
    var retval = _.extend({_id: db_resp[db.id]}, o);
    retval._id = db_resp[db.id];
    short.queues[retval.name] = new job_processor(retval);    
    cb(null, short.queues[retval.name]);
  });
};

Shortline.prototype.update_receiver = function(name,o,cb){
  var short = this;
  short.get_receiver(name,function(err,queue){
    if(err) return cb(err);
    db.update_receiver(name,o,function(err,receiver){
      if(err) return cb(err);
      if(short.queues[name]){
        if(o.name && name !== o.name){
          short.queues[o.name] = short.queues[name];
          delete short.queues[name];
          name = o.name;
        }
        short.queues[name].update(o);
      }
      cb(null,short.queues[name]);
    });
  });
};


Shortline.prototype.remove_receiver = function(name,cb){
  delete this.queues[name];
  db.remove_receiver(name,cb);
};

// paths
Shortline.prototype.add_path = function(receiver_name, options, cb){
  var short = this;
  db.add_path(receiver_name, options, function(err,db_resp){
    if(err) return cb(err);
    var retval = _.extend({_id: db_resp[db.id]}, options);
    short.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      receiver.update({paths: [retval]});
      cb(null,retval);
    });
  });
};

Shortline.prototype.update_path = function(receiver_name,path_name,updates,cb){
  var short = this;
  db.update_path(receiver_name,path_name,updates,function(err, db_resp){
    if(err) return cb(err);
    short.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      // TODO: delete old path on receiver
      receiver.update({paths: [updates]});
      cb(null,updates);
    });
  });
};

Shortline.prototype.remove_path = function(receiver_name,path_name,cb){
  var short = this;
  db.remove_path(receiver_name,path_name,function(err){
    short.get_receiver(receiver_name,function(err,receiver){
      if(err) return cb(err);
      delete receiver.paths[path_name];
      cb(null);
    });
  });
};

Shortline.prototype.get_path = function(receiver_name,path_name,cb){
  this.get_receiver(receiver_name,function(err,receiver){
    if(err) return cb(err);
    var path = receiver.paths[path_name];
    if(path) cb(null,path,receiver);
    else cb(new Error('Path not found'));
  });
};

// jobs
Shortline.prototype.find_jobs_by_receiver_id = function(receiver_id, o, cb){
  o = o || {};
  o.limit = o.limit || 50;
  db.find_jobs_by_receiver_id(receiver_id, o, cb);
};

Shortline.prototype.find_jobs_by_receiver_name = function(receiver_name, o, cb){
  o = o || {};
  db.find_jobs_by_receiver_name(receiver_name, o, cb);
};

Shortline.prototype.create_job = function(options,cb){
  db.create_job(options,function(err, db_resp, job){
    if(err){
      cb(err);
    } else {
      var response = _.extend({_id: db_resp[db.id]}, options);
      cb(null, response, job);
    }
  });
};

Shortline.prototype.get_job = function(job_id,cb){
  db.get_job(job_id,cb);
};

// empty db
Shortline.prototype.remove_all = function(cb){
  this.queues = {};
  db.remove_all(cb);
};
