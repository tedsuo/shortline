var mysql = require('db-mysql');
var environment = require('./lib/environment')(process.env.NODE_ENV);
var config = require('./config');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

util.inherits(this, EventEmitter);

new mysql.Database(config.db[environment]).on('error', function(err){
  console.log('Error:' + err);
}).on('ready', function(server){
  exports.emit('open');
}).connect();


