var client = require('./client');
var Job = require('./models').Job;
var async = require('async');
var _ = require('underscore');
var kp = client.key_prefix;

exports.id = 'id';

exports.find_all_receivers = function(callback){
  client.hgetall(kp+'_receivers_name_id_map', err(callback, function(receiver_ids){
    var receiver_lookups = [];
    _.each(receiver_ids,function(receiver_id){
      receiver_lookups.push(function(done){
        find_receiver_by_id(receiver_id, done);
      });
    });
    async.parallel(receiver_lookups, callback);
  }));
};

exports.find_receiver_by_name = function(receiver_name, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    if(err) return callback(err);
    find_receiver_by_id(receiver_id, callback);
  });
};

exports.add_receiver = function(options, callback){
  var paths;
  var insert_options = _.clone(options);
  if(insert_options.paths){
    paths = insert_options.paths;
    delete insert_options.paths;
  }
  client.incr(kp+'_receivers_key',function(err, key_id){
    if(err) return callback(err);
    client.hset(kp+'_receivers_name_id_map', options.name, key_id, function(err){
      if(err) return callback(err);
      client.hmset(build_hmset_args(insert_options, kp+'_receivers:'+key_id), function(err){
        if(err) return callback(err);
        var insert_path_functions = [];
        _.each(paths, function(path){
          insert_path_functions.push(function(done){
            exports.add_path_by_receiver_id(key_id, path, function(err){
              done(err);
            });
          });
        });
        async.parallel(insert_path_functions, function(err){
          if(err) return callback(err);
          callback(null, {id: key_id});
        });
      });
    });
  })
};

exports.add_path_by_receiver_id = function(receiver_id, options, callback){
  options.receiver_id = receiver_id;
  client.incr(kp+'_paths_key',function(err, key_id){
    if(err) return callback(err);
    client.hset(kp+'_receivers:'+receiver_id+':paths', options.name, key_id, function(err){
      if(err) return callback(err);
      client.hmset(build_hmset_args(options, kp+'_paths:'+key_id), function(err){
        if(err) return callback(err);
        callback(null, {id: key_id});
      });
    });
  });
};

exports.add_path = function(receiver_name, options, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    if(err) return callback(err);
    exports.add_path_by_receiver_id(receiver_id, options, callback);
  });
};

exports.update_receiver = function(receiver_name, options, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    if(err) return callback(err);
    client.hmset(build_hmset_args(options, kp+'_receivers:'+receiver_id), function(err, result){
      if(err) return callback(err);
      if(options.name && options.name != receiver_name){
        client.hdel(kp+'_receivers_name_id_map', receiver_name, function(err){
          if(err) return callback(err);
          client.hset(kp+'_receivers_name_id_map', options.name, receiver_id, function(err){
            if(err) return callback(err);
            callback(null, result);
          });
        });
      } else {
        callback(null, result);
      }
    }); 
  });
};

exports.update_path = function(receiver_name, path_name, options, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    client.hget(kp+'_receivers:'+receiver_id+':paths', path_name, function(err, path_id){
      client.hmset(build_hmset_args(options, kp+'_paths:'+path_id), function(err, result){
        if(err) return callback(err);
        if(options.name && options.name != path_name){
          client.hdel(kp+'_receivers:'+receiver_id+':paths', path_name, function(err){
            if(err) return callback(err);
            client.hset(kp+'_receivers:'+receiver_id+':paths', options.name, path_id, callback);
          });
        } else {
          callback(null, result);
        }
      });
    });
  });
}

exports.remove_receiver = function(receiver_name, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    client.hdel(kp+'_receivers_name_id_map', receiver_name, function(err){
      remove_receiver_by_id(receiver_id, callback);
    });
  });
};

exports.remove_path = function(receiver_name, path_name, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    if(err) return callback(err);
    client.hget(kp+'_receivers:'+receiver_id+':paths', path_name, function(err, path_id){
      if(err) return callback(err);
      client.hdel(kp+'_receivers:'+receiver_id+':paths', path_name, function(err){
        if(err) return callback(err);
        client.del(kp+'_paths:'+path_id, callback);
      });
    });
  });
};

exports.remove_all = function(callback){
  client.del(kp+'_receivers_name_id_map', err(callback, function(){
    var deletes_prefixes = ['receivers', 'paths', 'jobs'];
    var key_tasks = [];
    _.each(deletes_prefixes, function(deletes_prefix){
      key_tasks.push(function(done){
        client.keys(kp+'_'+deletes_prefix+':*', err(done, function(keys){
          done(null, keys);
        }));
      });
      key_tasks.push(function(done){
        client.del(kp+'_'+deletes_prefix+'_key', err(done, function(stuff){
          done();
        }));
      });
    });
    async.parallel(key_tasks, err(callback, function(keys){
      var delete_keys = [];
      _.each(_.flatten(_.compact(keys), true), function(key){
        delete_keys.push(function(done){
          client.del(key, err(done, function(){
            done();
          }));
        });
      });
      async.parallel(delete_keys, err(callback, function(){
        callback();
      }));
    }));
  }));
};

exports.find_jobs_by_receiver_id = function(receiver_id, options, callback){
  if(options.statuses){
    var limit = options.limit || -1;
    var job_statuses = ["queued", "overflow"];
    var job_status_lookups = [];
    _.each(job_statuses, function(job_status){
      job_status_lookups.push(function(next){
        if(_.include(options.statuses, job_status)){
          client.lrange(kp+'_receivers:'+receiver_id+':jobs_'+job_status, 0, limit, err(callback, function(job_ids){
            limit -= job_ids.length;
            next(limit == 0 ? 'done' : null, job_ids);
          }));
        } else {
          next();
        }
      });
    });
    async.series(job_status_lookups, function(err, jobs){
      if(err && err != 'done') return callback(err);
      lookup_jobs(_.flatten(_.compact(jobs), true));
    });
  } else {
    client.smembers(kp+'_receivers:'+receiver_id+':jobs', err(callback, function(job_ids){
      if(options.limit){
        job_ids = job_ids.slice(0, options.limit);
      }
      lookup_jobs(job_ids);      
    }));
  }
  function lookup_jobs(job_ids){
    var job_lookups = [];
    _.each(job_ids, function(job_id){
      job_lookups.push(function(done){
        client.hgetall(kp+'_jobs:'+job_id, err(done, function(job_attribs){
          var job = new Job(job_attribs);
          done(null, job);
        }));
      });
    });
    async.parallel(job_lookups, err(callback, function(jobs){
      callback(null, jobs);
    }));
  }
};

exports.find_jobs_by_receiver_name = function(receiver_name, options, callback){
  find_receiver_id_by_name(receiver_name, err(callback, function(receiver_id){
    exports.find_jobs_by_receiver_id(receiver_id, options, callback);
  }));
};

exports.create_job = function(options, callback){
  var job = new Job(options);
  job.createJob(function(err, result){
    if(err) return callback(err);
    callback(null, {id: job._id}, job);
  });
};

exports.get_job = function(id, callback){
  client.hgetall(kp+'_jobs:'+id, function(err, result){
    if(err) return callback(err);
    if(result == null) return callback(new Error("No job with id '"+id+"' found."));
    result._id = id;
    callback(null, result);
  });
};

function err(cb, cont){
  return function(err, result){
    if(err) return cb(err);
    cont(result);
  }
}

function find_receiver_by_id(receiver_id, callback){
  client.hgetall(kp+'_receivers:'+receiver_id, function(err, receiver){
    if(err) return callback(err);
    if(_.size(receiver) == 0) return callback(new Error("No receiver with id "+receiver_id+" found."));
    var retval = receiver;
    retval._id = receiver_id;
    retval.paths = {};
    client.hgetall(kp+'_receivers:'+receiver_id+':paths', function(err, path_ids){
      if(err) return callback(err);
      var path_lookups = [];
      _.each(path_ids, function(path_id){
        path_lookups.push(function(done){
          client.hgetall(kp+'_paths:'+path_id, function(err, path){
            path._id = path_id;
            retval.paths[path.name] = path;
            done();
          });
        });
      });
      async.parallel(path_lookups, function(err){
        if(err) return callback(err);
        callback(null, retval);
      });
    });
  });
};

function remove_receiver_by_id(receiver_id, callback){
  client.del(kp+'_receivers:'+receiver_id, function(err){
    if(err) return callback(err);
    client.hgetall(kp+'_receivers:'+receiver_id+':paths', function(err, paths){
      if(err) return callback(err);
      client.del(kp+'_receivers:'+receiver_id+':paths', function(err){
        if(err) return callback(err);
        var path_deletes = [];
        _.each(paths, function(path_id){
          path_deletes.push(function(done){
            client.del(kp+'_paths:'+path_id, done);
          });
        });
        async.parallel(path_deletes, function(err){
          if(err) return callback(err);
          callback();
        });
      });
    });
  });
}

function build_hmset_args(options, hash_name){
  var hmset_options = [hash_name];
  for(var x in options){
    hmset_options.push(x);
    hmset_options.push(options[x]);
  }
  return hmset_options;
}

function find_receiver_id_by_name(receiver_name, callback){
  client.hget(kp+'_receivers_name_id_map', receiver_name, function(err, receiver_id){
    if(err) return callback(err);
    if(receiver_id == null) return callback(new Error("No receiver '"+receiver_name+"' found."));
    callback(null, receiver_id);
  });
}
