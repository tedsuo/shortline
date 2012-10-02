var redis = require('redis');
var environment = require('../../environment')(process.env.NODE_ENV);
var arguments = require('../../config').db[environment];

var client = redis.createClient(arguments.port, arguments.host, arguments);
if(arguments.password) client.auth(arguments.password);

client.key_prefix = arguments.key_prefix;

module.exports = client;

client.on('error', function(err){
  console.log('Error:' + err);
});
