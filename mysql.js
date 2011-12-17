var mysql = require('db-mysql');
var environment = require('./lib/environment')(process.env.NODE_ENV);
var config = require('./config');
var async = require('async');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var server;

function add_where_args(options, query){
  var where_strings = [];
  var where_values = [];
  for(x in options){
    where_strings.push(x+" = ?");
    where_values.push(options[x]);
  }
  if(where_strings.length > 0){
    var where_string = where_strings.join(' AND ');
    query = query.where(where_string, where_values);
  }
  return query;
}

function build_insert_args(options){
  var cols_arr = [];
  var vals_arr = [];
  for(x in options){
    cols_arr.push(x);
    vals_arr.push(options[x]);
  }
  return {cols: cols_arr, vals: vals_arr};
}

exports.emitter = new EventEmitter();

exports.find_receiver = function(options, callback){
  var receiver_query = server.query().select('*').from('receivers');
  receiver_query = add_where_args(options, receiver_query);
  receiver_query.execute(function(error, rows){
    if(error){
      callback(error);
    } else {
      var path_queries = [];
      _.each(rows, function(row){
        path_queries.push(function(done){
          server.query().
          select('*').
          from('paths').
          where('receiver_id = ?', [row.id]).
          execute(function(error, rows){
            if(error){
              done(error)
            } else {
              row.paths = rows;
              done();
            }
          });
        });
      });
      async.parallel(path_queries, function(error){
        if(error){
          callback(error);
        } else {
          callback(null, rows);
        }
      });
    }
  });
};

exports.add_receiver = function(options, callback){
  var insert_args = build_insert_args(options);
  server.query().insert(
    'receivers',
    insert_args.cols,
    insert_args.vals
  ).execute(function(error, result){
    if(error){
      callback(error);
    } else {
      callback(null, result);
    }
  });
};

exports.add_path = function(receiver_name, options, callback){
  exports.find_receiver({'name': receiver_name}, function(error, rows){
    if(error){
      callback(error);
    } else {
      var inserts = [];
      _.each(rows, function(row){
        inserts.push(function(done){
          var insert_args = build_insert_args(options);
          insert_args.cols.push('receiver_id');
          insert_args.vals.push(row.id);
          server.query().insert(
            'paths',
            insert_args.cols,
            insert_args.vals
          ).execute(function(error, result){
            if(error){
              done(error)
            } else {
              done(null, result);
            }
          });
        });
      });
      async.parallel(inserts, function(error, results){
        if(error){
          callback(error);
        } else {
          callback();
        }
      });
    }
  });
};

exports.update_receiver = function(receiver_name, options, callback){
  server.query().update(
    'receivers'
  ).set(
    options
  ).where(
    'name = ?', [receiver_name]
  ).execute(function(error, result){
    if(error){
      callback(error)
    } else {
      callback(null, result);
    }
  });
};

exports.update_path = function(receiver_name, path_name, options, callback){
  exports.find_receiver({'name': receiver_name}, function(error, rows){
    if(error){
      callback(error);
    } else {
      var updates = [];
      _.each(rows, function(row){
        updates.push(function(done){
          server.query().update(
            'paths'
          ).set(
            options
          ).where(
            'name = ? AND receiver_id = ?', [path_name, row.id]
          ).execute(function(error, result){
            if(error){
              done(error)
            } else {
              done(null, result);
            }
          });
        });
      });
      async.parallel(updates, function(error, results){
        if(error){
          callback(error);
        } else {
          callback();
        }
      });
    }
  });
};

exports.remove_receiver = function(receiver_name, callback){
  exports.find_receiver({'name': receiver_name}, function(error, rows){
    if(error){
      callback(error);
    } else {
      var removes = [];
      _.each(rows, function(row){
        removes.push(function(done){
          server.query().delete().
          from('receivers').
          where('id = ?', [row.id]).
          execute(function(error, result){
            if(error){
              done(error);
            } else {
              server.query().delete().
              from('paths').
              where('receiver_id = ?', [row.id]).
              execute(function(error, result){
                if(error){
                  done(error);
                } else {
                  done();
                }
              })
            }
          });
        });
      });
      async.parallel(removes, function(err){
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
  exports.find_receiver({'name': receiver_name}, function(error, rows){
    if(error){
      callback(error);
    } else {
      var removes = [];
      _.each(rows, function(row){
        removes.push(function(done){
          server.query().delete().
          from('paths').
          where(
            'name = ? AND receiver_id = ?', [path_name, row.id]
          ).execute(function(error, result){
            if(error){
              done(error)
            } else {
              done(null, result);
            }
          });
        });
      });
      async.parallel(removes, function(error, results){
        if(error){
          callback(error);
        } else {
          callback();
        }
      });
    }
  });
};

exports.remove_all = function(callback){
  var tables = ['paths', 'jobs', 'receivers'];
  var table_functions = [];
  _.each(tables, function(table){
    table_functions.push(function(done){
      server.query().delete().
      from(table).
      execute(function(error, result){
        if(error){
          done(error);
        } else {
          done();
        }
      });
    });
  });
  async.parallel(table_functions, function(err, results){
    if(err){
      callback(err);
    } else {
      callback();
    }
  });
};

new mysql.Database(config.db[environment]).on('error', function(err){
  console.log('Error:' + err);
}).connect(function(error){
  server = this;
  exports.emitter.emit('open');
});
