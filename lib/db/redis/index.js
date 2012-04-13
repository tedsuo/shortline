var client = require('./client');
var async = require('async');
var _ = require('underscore');
var kp = client.key_prefix;

exports.id = 'id';

exports.find_receiver_by_name = function(receiver_name, callback){
  find_receiver_id_by_name(receiver_name, function(err, receiver_id){
    if(err) return callback(err);
    client.hgetall(kp+'_receivers:'+receiver_id, function(err, receiver){
      if(err) return callback(err);
      var retval = receiver;
      retval._id = receiver_id;
      retval.paths = [];
      client.hgetall(kp+'_receivers:'+receiver_id+':paths', function(err, path_ids){
        if(err) return callback(err);
        var path_lookups = [];
        _.each(path_ids, function(path_id){
          path_lookups.push(function(done){
            client.hgetall(kp+'_paths:'+path_id, function(err, path){
              path._id = path_id;
              retval.paths.push(path);
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
    callback(null, receiver_id);
  });
}
