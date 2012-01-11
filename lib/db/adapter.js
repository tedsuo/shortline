var config = require('../../config');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;

exports.emitter = new EventEmitter();

var adapter_functions = [
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
    'create_job'
];

var environment = require('../environment')(process.env.NODE_ENV);

var db_driver;
if(config.db[environment].adapter == "mysql"){
  db_driver = require('./mysql');
} else {
  db_driver = require('./mongo');
}

db_driver.emitter.on('open', function(){
  exports.emitter.emit('open');
});
_.each(adapter_functions, function(adapter_function){
    exports[adapter_function] = db_driver[adapter_function];
});