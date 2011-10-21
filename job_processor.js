var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var _ = require('underscore');

var JobProcessor = function(concurrency, host, port){
  this.queue = []; 
  var httpAgent = http.getAgent(host, port);
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
  var options = _.extend({path: url}, this.options);
  var req = http.request(options);
  req.write(payload);
  req.end();
  setTimeout(function(){
    req.abort();
  }, timeout);
  //this.emit('push');
};

//JobProcessor.prototype.pushHandler = function(){
//};

module.exports = JobProcessor;
