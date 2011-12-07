#!/usr/bin/env node
var express = require('express');
var _ = require('underscore');
var models = require('./models');
var async = require('async');
var config = require('./config');
var job_processor = require('./job_processor');

var receiver = express.createServer();

receiver.configure('development', function(){
  receiver.use(receiver.router);
  receiver.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var job_queues = {};

models.Receiver.find({}, function(err, receivers){
  _.each(receivers, function(receiver){
    job_queues[receiver.name] = new job_processor(receiver);
  });
});

receiver.get('/', function(req, res){
  res.send("Welcome to JobBoard.  Please read the <a href='https://github.com/tedsuo/Job-Board'>documentation</a> to use.");
});

receiver.post('/:receiver_name/:path_name', function(req, res){
  if(!_.include(config.trusted_ips, req.client.remoteAddress)){
    res.send("You are not authorized to push to JobBoard.");
    console.log('An unauthorized client tried to push to job board from ip ' + req.connection.remote_address);
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
      if(job_queues[req.params.receiver_name]){
        done(null, job_queues[req.params.receiver_name].receiver);
      } else {
        models.Receiver.find_by_name(req.params.receiver_name,function(err,receiver){
          done(null, receiver);
        });
      }
    }
  }, function(err, results){
    if(err){ res.end(err);
      return;
    }

    if(!results.receiver){
      res.end("No receiver by that name found.");
      console.log("No receiver '" + req.params.receiver_name + "' found.");
      return;
    }

    var receiver = results.receiver;

    if(!job_queues[receiver.name]){
      job_queues[receiver.name] = new job_processor(receiver);
    }

    var path = _.detect(receiver.paths, function(path){
      return path.name == req.params.path_name; 
    });

    if(!path){
      res.end('No path by that name found.');
      console.log("No path '" + req.params.path_name + "' found.");
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

    job.on('job_saved', function(){
      res.end('Job saved. Good job!');
      job.remove_listeners();
    });

    job.on('job_save_error', function(){
      res.end('Job failed to save');
      job.remove_listeners();
    });
    
    job_queues[receiver.name].push(job);
  });
});

receiver.listen(config.port);

console.log("Job Board started listening on TCP/" + config.port);
