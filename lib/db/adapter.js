var config = require('../config');
var environment = require('../environment')(process.env.NODE_ENV);
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

exports.emitter = new EventEmitter();

var adapter_exports = [
  'id',
  'find_receiver',
  'find_receiver_by_name',
  'add_receiver',
  'add_path',
  'update_receiver',
  'update_path',
  'remove_receiver',
  'remove_path',
  'remove_all',
  'find_jobs_by_receiver_id',
  'find_jobs_by_receiver_name',
  'create_job',
  'get_job'
];

var environment = require('../environment')(process.env.NODE_ENV);

var db_driver;
if(config.db[environment].adapter == "mysql"){
  db_driver = require('./mysql');
} else {
  db_driver = require('./mongo');
}

_.each(adapter_exports, function(adapter_export){
  exports[adapter_export] = db_driver[adapter_export];
});
