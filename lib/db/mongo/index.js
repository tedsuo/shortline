var _ = require('underscore');
var models = require('./models');
var async = require('async');

function parse_statuses(statuses){
    var status_arr = [];
    if(statuses){
      _.each(statuses, function(status){
        status_arr.push({status: status});
      });
    }
    return status_arr;
}

exports.find_receiver = function(options, callback){
  models.Receiver.find(options, callback);
};

exports.find_receiver_by_name = function(receiver_name, callback){
  models.Receiver.find_by_name(receiver_name, callback);
}

exports.add_receiver = function(options, callback){
  var receiver = new models.Receiver(options);
  receiver.save(callback);
};

exports.add_path = function(receiver_name, options, callback){
  models.Receiver.find_by_name(receiver_name, function(err, receiver){
    if(err){
      callback(err);
    } else {
      receiver.paths.push(options);
      receiver.save(callback);
    }
  });
};

exports.update_receiver = function(receiver_name, options, callback){
  models.Receiver.find_by_name(receiver_name, function(err, receiver){
    if(err){
      callback(err);
    } else {
      for(x in options){
        receiver[x] = options[x];
      }
      receiver.save(callback);
    }
  });
};

exports.update_path = function(receiver_name, path_name, options, callback){
  models.Receiver.find_by_name(receiver_name, function(err, receiver){
    if(err){
      callback(err);
    } else {
      var pathIndex = _.indexOf(receiver.paths, _.detect(receiver.paths, function(path){
        return path.name == path_name;
      }));
      if(pathIndex == -1){
        callback(err);
      }
      for(x in options){
        receiver.paths[pathIndex][x] = options[x];
      }
      receiver.save(callback);
    }
  });
};

exports.remove_receiver = function(receiver_name, callback){
  models.Receiver.find_by_name(receiver_name, function(err, receiver){
    if(err){
      callback(err);
    } else {
      receiver.remove(callback);
    }
  });
};

exports.remove_path = function(receiver_name, path_name, callback){
  models.Receiver.find_by_name(receiver_name, function(err, receiver){
    if(err){
      callback(err);
    } else {
      var pathIndex = _.indexOf(receiver.paths, _.detect(receiver.paths, function(path){
        return path.name == path_name;
      }));
      if(pathIndex == -1){
        callback(err);
      } else {
        receiver.paths[pathIndex].remove();
        receiver.save(callback);
      }
    }
  });
};

exports.remove_all = function(callback){
  models.Receiver.collection.conn.db.dropDatabase(callback);
};

exports.find_jobs_by_receiver_id = function(receiver_id, options, callback){
  var status_arr = parse_statuses(options.statuses);
  var q = models.Job.find({
    'receiver_id': receiver_id
  }).or(status_arr).sort('created', 'ascending');
  if(options.limit) q = q.limit(options.limit);
  q.execFind(function(err, jobs){
    if(err){
      callback(err);
    } else {
      callback(null, jobs);
    }
  });
};

exports.find_jobs_by_receiver_name = function(receiver_name, options, callback){
  if(receiver_name){
    exports.find_receiver_by_name(receiver_name, function(err, receiver){
      if(err){
        callback(err);
      } else {
        exports.find_jobs_by_id(receiver._id, options, function(err, jobs){
          if(err){
            callback(err);
          } else {
            _.each(jobs, function(job){
              job.receiver_name = receiver_name;
            });
            callback(null, jobs);
          }
        });
      }
    });
  } else {
    var receiver_name_mapping = {};
    var status_arr = parse_statuses(options.statuses);
    var q = models.Job.find({}).or(status_arr).sort('created', 'ascending');
    if(options.limit) q = q.limit(options.limit);
    q.execFind(function(err, jobs){
      if(err){
        callback(err);
      } else {
        var receiver_lookups = {};
        _.each(jobs, function(job){
          receiver_lookups[job.receiver_id] = function(done){
            models.Receiver.findOne({'_id': job.receiver_id}, function(err, doc){
              if(err){
                callback(err);
              } else {
                if(doc){
                  receiver_name_mapping[job.receiver_id] = doc.name;
                } else {
                  receiver_name_mapping[job.receiver_id] = job.receiver_id_id;
                }
                done();
              }
            });
          };
        });
        async.parallel(receiver_lookups, function(err){
          var x = 0;
          _.each(jobs, function(job){
            job.receiver_name = receiver_name_mapping[job.receiver_id];
          });
          callback(null, jobs);
        });
      }
    });
  }
};

exports.create_job = function(job, callback){
  return new models.Job(job);
};

