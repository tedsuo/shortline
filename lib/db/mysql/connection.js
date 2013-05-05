var mysql = require('mysql');
var environment = require('../../environment')(process.env.NODE_ENV);
var config = require('../../config');

var connection = mysql.createConnection(config.db[environment]);

module.exports = connection;

connection.on('error', function(err){
  console.log('Error:' + err);
});
