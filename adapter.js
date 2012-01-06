var config = require('./config');
var async = require('async');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

exports.emitter = new EventEmitter();

var environment = require('./lib/environment')(process.env.NODE_ENV);
if(config.db[environment].adapter == "mysql"){
  var mysql = require('./mysql');
  mysql.emitter.on('open', function(){
    exports.emitter.emit('open');
  });
  var mysql_functions = [
    'find_receiver',
    'add_receiver',
    'add_path',
    'update_receiver',
    'update_path',
    'remove_receiver',
    'remove_path',
    'remove_all',
    'find_jobs',
    'add_job'
  ];
  _.each(mysql_functions, function(mysql_function){
      exports[mysql_function] = mysql[mysql_function];
  });
} else {
  var models = require('./models');
  models.emitter.on('open', function(){
    exports.emitter.emit('open');
  });
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
  exports.find_jobs = function(receiver_name, callback){
      var receiver_name_mapping = {};
      if(receiver_name){
        var q = models.Job.find({
          'receiver.name': receiver_name
        }).or([{status: "overflow"},{status: "queued"}]).sort('created', 'ascending');
      } else {
        var q = models.Job.find({}).or([{status: "overflow"},{status: "queued"}]).sort('created', 'ascending');
      }

      q.execFind(function(err, jobs){
        if(err){
          callback(err);
        } else {
          var receiver_lookups = {};
          _.each(jobs, function(job){
            receiver_lookups[job.receiver_id] = function(done){
              models.Receiver.findOne({'_id': job.receiver_id}, function(err, doc){
                if(err){
                  done(err);
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
  };
  exports.add_job = function(options, callback){
    
  };
}
