var async = require('async');
var _ = require('underscore');
var Job = require('./models').Job;
var client = require('./client');

exports.id = 'insertId';

exports.find_all_receivers = function(callback){
  find_receivers({}, callback);
};

exports.find_receiver_by_name = function(receiver_name, callback){
  find_receivers({name: receiver_name}, function(err, results){
    if(err){
      callback(err);
    } else {
      if(results.length == 1){
        callback(null, results[0]);
      } else {
        callback(new Error("No receiver '"+receiver_name+"' found."));
      }
    }
  }, 1);
};

exports.add_receiver = function(options, callback){
  var insert_args = build_insert_args(options);
  client.query("INSERT INTO `receivers` ("+insert_args.cols_string+") VALUES ("+insert_args.vals_string+")", insert_args.vals, function(error, result){
    if(error) return callback(error);
    callback(null, result);
  });
};

exports.update_receiver = function(receiver_name, options, callback){
  var update_args = build_update_args(options);
  update_args.vals.push(receiver_name);
  client.query("UPDATE `receivers` SET "+update_args.cols_string+" WHERE `name` = ?", update_args.vals, function(error, result){
    if(error){
      callback(error)
    } else {
      callback(null, result);
    }
  });
};

exports.remove_receiver = function(receiver_name, callback){
  exports.find_receiver_by_name(receiver_name, function(error, row){
    if(error){
      callback(error);
    } else {
      client.query("DELETE FROM `receivers` WHERE `_id` = ?", [row._id], function(error, result){
        if(error) return callback(error);
        callback();
      });
    }
  });
};

exports.remove_all = function(callback){
  var tables = ['jobs', 'receivers'];
  var table_functions = [];
  _.each(tables, function(table){
    table_functions.push(function(done){
      client.query("DELETE FROM `"+table+"`", [], function(error, result){
        if(error){
          done(error);
        } else {
          done();
        }
      });
    });
  });
  async.parallel(table_functions, function(err, results){
    callback(err);
  });
};

exports.find_jobs_by_receiver_id = function(receiver_id, options, callback){
  var where_text = 'receiver_id = ?';
  var where_vars = [receiver_id];
  var where_obj = parse_statuses(options.statuses);
  if(where_obj.vars.length > 0){
    where_text += " AND ("+where_obj.text+")";
    where_vars = _.flatten([where_vars, where_obj.vars]);
  }
  var q = "SELECT * FROM `jobs` WHERE " + where_text + " ORDER BY _id ASC" + (options.limit ? " LIMIT " + options.limit : "");
  client.query(q, where_vars, function(err, job_rows){
    if(options.receiver_name){
      _.each(job_rows, function(job_row){
        job_row.receiver_name = options.receiver_name;
      }); 
    }
    if(err){
      callback(err);
    } else {
      var job_list = [];
      _.each(job_rows, function(job_row){
        job_list.push(new Job(job_row));
      });
      callback(null, job_list);
    }
  });
}

exports.find_jobs_by_receiver_name = function(receiver_name, options, callback){
  if(receiver_name){
    exports.find_receiver_by_name(receiver_name, function(err, row){
      if(err){
        callback(err);
      } else {
        options.receiver_name = row.name;
        exports.find_jobs_by_receiver_id(row._id, options, callback);
      }
    });
  } else {
    var where_obj = parse_statuses(options.statuses);
    var q = "SELECT * FROM `jobs`";
    if(where_obj.vars.length > 0) q += " WHERE " + where_obj.text;
    q += " ORDER BY `_id` ASC" + (options.limit ? " LIMIT " + options.limit : "");
    client.query(q, where_obj.vars, function(err, rows){
      if(err){
        callback(err);
      } else {
        var receiver_lookup_functions = {};
        var receiver_mapping = {};
        _.each(rows, function(row){
          receiver_lookup_functions[row.receiver_id] = function(done){
            client.query("SELECT `name` FROM `receivers` WHERE `_id` = ?", [row.receiver_id], function(err, receiver_rows){
              if(err){
                done(err);
              }
              if(receiver_rows.length == 1){
                receiver_mapping[row.receiver_id] = receiver_rows[0].name;
              } else {
                receiver_mapping[row.receiver_id] = row.receiver_id;
              }
              done();
            });
          };
        });
        async.parallel(receiver_lookup_functions, function(err){
          if(err){
            callback(err);
          } else {
            _.each(rows, function(row){
              row.receiver_name = receiver_mapping[row.receiver_id];
            });
            callback(null, rows);
          }
        })
      }
    });
  }
};

exports.create_job = function(options, callback){
  var insert_args = build_insert_args(options);
  client.query("INSERT INTO `jobs` ("+insert_args.cols_string+") VALUES ("+insert_args.vals_string+")", insert_args.vals, function(err, result){
    if(err){
      callback(err);
    } else {
      var job = new Job(_.extend({_id: result.insertId},options));
      callback(null, result, job);
    }
  });
};

exports.get_job = function(id, callback){
  client.query("SELECT * FROM `jobs` WHERE `_id`=?",[id], function(err, result){
    if(err){
      callback(err);
    } else {
      if(result.length == 1){
        callback(null, result[0]);
      } else {
        callback(new Error("No job with id '"+id+"' found."));
      }
    }
  });
}


// MySQL statement helpers

function find_receivers(options, callback, limit){
  var receiver_query = "SELECT * FROM `receivers`";
  var where_args = generate_where_args(options);
  if(where_args.values.length > 0){
    receiver_query += " WHERE " + where_args.string;
  }
  if(limit != null) receiver_query += " LIMIT " + limit;
  client.query(receiver_query, where_args.values, function(error, rows){
    if(error) return callback(error);
    callback(null, rows);
  });
};

function generate_where_args(options){
  var retval = {
    'string': null,
    'values': []
  };
  var where_strings = [];
  for(var x in options){
    where_strings.push(x+" = ?");
    retval.values.push(options[x]);
  }
  if(where_strings.length > 0){
    retval.string = where_strings.join(' AND ');
  }
  return retval;
}

function build_insert_args(options){
  var cols_arr = [];
  var vals_arr = [];
  var vals_string_arr = [];
  for(var x in options){
    cols_arr.push('`'+x+'`');
    vals_arr.push(options[x]);
    vals_string_arr.push("?");
  }
  return {cols_string: cols_arr.join(', '), vals_string: vals_string_arr.join(', '), vals: vals_arr};
}

function build_update_args(options){
  var cols_string_arr = [];
  var vals_arr = [];
  for(var x in options){
    cols_string_arr.push("`"+x+"` = ?");
    vals_arr.push(options[x]);
  }
  return {cols_string: cols_string_arr.join(', '), vals: vals_arr};
}

function parse_statuses(statuses){
  var where_obj = {
    text: null,
    vars: []
  }
  var where_text_arr = [];
  if(statuses){
    _.each(statuses, function(status){
      where_obj.vars.push(status);
      where_text_arr.push('status = ?');
    });
    where_obj.text = where_text_arr.join(" OR ");
  }
  return where_obj;
}
