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

  req.on('end', function(){
    jb.push({
      receiver: req.params.receiver_name,
      path: req.params.path_name,
      payload: req_json_string
    },function(err){
      if(err) return res.end(err.toString());
      res.end('Job saved. Good job!');
    });
  });
});