var EventEmitter = require('events').EventEmitter;
var util = require('util');
var http = require('http');
var _ = require('underscore');

var JobProcessor = function(concurrency, host, port){
  this.queue = []; 
  // Node 0.6
  var httpAgent = new http.Agent();
  // Node 0.4
  //var httpAgent = http.getAgent(host, port);
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

JobProcessor.prototype.push = function(job){
  var options = _.extend({path: '/'+job.path}, this.options);
  var timeout_task;
  console.log(options);
  var req = http.request(options, function(res){
    res.on('data', function(chunk){
      console.log('body: '+chunk);
    });
    res.on('end', function(){
      console.log(res.statusCode);
      clearTimeout(timeout_task);
      if(res.statusCode == 200){
        JobProcessor.setJobStatus(job, "complete");
      } else {
        JobProcessor.setJobStatus(job, "failed");
      }
    });
  });
  req.write(job.payload);
  req.end();
  req.on('error', function(err){
    clearTimeout(timeout_task);
    JobProcessor.setJobStatus(job, "error");
    console.log('Error: '+err.message);
  });
  timeout_task = setTimeout(function(){
    req.removeAllListeners('error');
    req.on('error', function(){});
    JobProcessor.setJobStatus(job, "timeout");
    console.log("Timeout!");
    req.abort();
  }, job.timeout);
  //this.emit('push');
};

JobProcessor.setJobStatus = function(job, status){
  job.status = status;
  job.save(function(err){
    if(err){
      console.log('Job '+status+', status failed to save');
    } else {
      console.log('Job '+status+', status saved');
    }
  });
}

//JobProcessor.prototype.pushHandler = function(){
//};

module.exports = JobProcessor;
