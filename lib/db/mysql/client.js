var mysql = require('mysql');
var environment = require('../../environment')(process.env.NODE_ENV);
var config = require('../../config');

var client = mysql.createClient(config.db[environment]);

module.exports = client;

client.on('error', function(err){
  console.log('Error:' + err);
});