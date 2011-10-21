#!/usr/bin/env node
var express = require('express');
var _ = require('underscore');
var models = require('./models');
var async = require('async');
var config = require('./config');
var job_processor = require('./job_processor');

var trusted_ips = [
  '127.0.0.1'
];

var receiver = express.createServer();

var job_queues = {};

receiver.get('/', function(req, res){
  res.send("Welcome to JobBoard.  Please read the <a href='https://github.com/tedsuo/Job-Board'>documentation</a> to use.");
});

receiver.post('/:receiver_name/:path_name', function(req, res){
  if(!_.include(trusted_ips, req.client.remoteAddress)){
    res.send("You are not authorized to push to JobBoard.");
    return;
  }

  var req_json_string = '';
  req.on('data', function(data){
    req_json_string += data;
  });

  async.parallel({
    request_data: function(done){
      req.on('end', function(){
        done();
      });
    },
    receiver: function(done){
      models.Receiver.find_by_name(req.params.receiver_name,function(err,receiver){
        done(null, receiver);
      });
    }
  }, function(err, results){
    if(err){
      res.end(err);
      return;
    }

		if(!results.receiver){
			res.end("No receiver by that name found.");
			return;
		}

    var receiver = results.receiver;

		if(!job_queues[receiver.name]){
			job_queues[receiver.name] = new job_processor(receiver.concurrency, receiver.host, receiver.port);
		}

    var path = _.detect(receiver.paths, function(path){
      return path.name == req.params.path_name; 
    });

    if(!path){
      res.end('No path by that name found.');
      return;
    }

    var job = new models.Job({
      path: path.url,
      payload: req_json_string,
      host: receiver.host,
      port: receiver.port || config.default_receiver_port,
      timeout: path.timeout || config.default_receiver_timeout,
      receiver: receiver
    });

    job.save(function(err){
      if(err){
        res.end('Job failed to save');
      }else{
				job_queues[receiver.name].push(job.path, job.payload, job.timeout);
        throw "blah";
        res.end('Job saved. Good job!');
      }
    });
  });
});

receiver.configure('development', function(){
  receiver.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

receiver.listen(8009);

console.log("Started listening on TCP/8009");
