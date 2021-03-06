var config = require('../config');
var environment = require('../environment')(process.env.NODE_ENV);
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

exports.emitter = new EventEmitter();

var adapter_exports = [
  'id',
  'find_all_receivers',
  'find_receiver_by_name',
  'add_receiver',
  'update_receiver',
  'remove_receiver',
  'remove_all',
  'find_jobs_by_receiver_id',
  'find_jobs_by_receiver_name',
  'create_job',
  'get_job'
];

var environment = require('../environment')(process.env.NODE_ENV);

var db_driver;
switch(config.db[environment].adapter){
  case "mysql":
    db_driver = require('./mysql');
    break;
  case "redis":
    db_driver = require('./redis');
    break;
  case "mongo":
    db_driver = require('./mongo');
    break;
}

_.each(adapter_exports, function(adapter_export){
  exports[adapter_export] = db_driver[adapter_export];
});
