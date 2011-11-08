var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var _ = require('underscore');

var JobProcessor = function(concurrency, host, port){
  this.queue = []; 
  var httpAgent = new http.Agent();
  httpAgent.maxSockets = concurrency;
  this.options = {
    host: host,
    agent: httpAgent,
    port: port,
    method: 'POST'
  };
  //EventEmitter.call(this);
  //this.on('push',this.pushHandler.bind(this));
};

//util.inherits(JobProcessor, EventEmitter);

JobProcessor.prototype.push = function(url, payload, timeout){
  var options = _.extend({path: '/'+url}, this.options);
  console.log(options);
  var req = http.request(options, function(res){
    res.on('data', function(chunk){
      console.log('body: '+chunk);
    });
  });
  req.write(payload);
  req.end();
  req.on('error', function(err){
    console.log('Error: '+err.message);
  });
  setTimeout(function(){
    console.log("Timeout!");
    req.abort();
  }, timeout);
  //this.emit('push');
};

//JobProcessor.prototype.pushHandler = function(){
//};

module.exports = JobProcessor;
