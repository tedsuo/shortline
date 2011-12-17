var config = require('./config');
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
    'remove_all'
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
    models.Receiver.find(options, function(err, docs){
      if(err){
        callback(err);
      } else {
        callback(null, docs);
      }
    });
  };
  exports.add_receiver = function(options, callback){
    var receiver = new models.Receiver(options);
    receiver.save(function(err){
      if(err){
        callback(err);
      } else {
        callback();
      }
    });
  };
  exports.add_path = function(receiver_name, options, callback){
    models.Receiver.find_by_name(receiver_name, function(err, receiver){
      if(err){
        callback(err);
      } else {
        receiver.paths.push(options);
        receiver.save(function(err){
          if(err){
            callback(err);
          } else {
            callback();
          }
        });
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
        receiver.save(function(err){
          if(err){
            callback(err);
          } else {
            callback();
          }
        });
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
        receiver.save(function(err){
          if(err){
            callback(err);
          } else {
            callback();
          }
        });
      }
    });
  };
  exports.remove_receiver = function(receiver_name, callback){
    models.Receiver.find_by_name(receiver_name, function(err, receiver){
      if(err){
        callback(err);
      } else {
        receiver.remove(function(err){
          if(err){
            callback(err);
          } else {
            callback();
          }
        });
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
          receiver.save(function(err){
            if(err){
              callback(err);
            } else {
              callback();
            }
          });
        }
      }
    });
  };
  exports.remove_all = function(callback){
    models.Receiver.collection.conn.db.dropDatabase(function(err){
      if(err){
        callback(err);
      } else {
        callback();
      }
    });
  };
}
