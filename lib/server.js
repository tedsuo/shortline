#!/usr/bin/env node
var environment = require('./environment')();
var path = require('path');
var log = require(path.normalize(__dirname+'/log'));
log.info('JobBoard server starting in '+environment+' mode');
var express = require('express');
var _ = require('underscore');
var adapter = require('./db/adapter');
var async = require('async');
var config = require('./config');
var JobBoard = require('./model/job_board');

var server = express.createServer();

server.configure('development', function(){
  server.use(server.router);
  server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var jb = new JobBoard();

jb.load_receivers(function(){
  server.listen(config.port);
  console.log("Job Board (mode: "+environment+") started listening on TCP/" + config.port);
});

server.get('/', function(req, res){
  res.send("Welcome to JobBoard.  Please read the <a href='https://github.com/tedsuo/Job-Board'>documentation</a> to use.");
});

// create job
server.post('/:receiver_name/:path_name', function(req, res){
  if(!_.include(config.trusted_ips, req.client.remoteAddress)){
    res.send("You are not authorized to push to JobBoard.");
    console.log('An unauthorized client tried to push to job board from ip ' + req.client.remoteAddress);
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
      jb.get_receiver(req.params.receiver_name,done);
    }
  }, function(err, results){
    if(err){ 
      res.end(err.toString());
      console.log(err.toString());
      return;
    }
    
    var receiver = results.receiver;

    var path = _.detect(receiver.paths, function(path){
      return path.name == req.params.path_name; 
    });

    if(!path){
      res.end('No path by that name found.');
      console.log("No path '" + req.params.path_name + "' found.");
      return;
    }
    
    log.info('REC_ID: '+receiver.id);

    jb.create_job(
      {
        path: path.url,
        payload: req_json_string,
        host: receiver.host,
        port: receiver.port || config.default_receiver_port,
        timeout: path.timeout || config.default_receiver_timeout,
        receiver_id: receiver.id
      },
      function(err,job){
        job.on('job_saved', function(){
          res.end('Job saved. Good job!');
          job.removeAllListeners();
        });

        job.on('job_save_error', function(){
          res.end('Job failed to save');
          job.removeAllListeners();
        });
        
        receiver.push(job);
      }
    );

    
  });
});