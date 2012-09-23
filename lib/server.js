#!/usr/bin/env node
var environment = require('./environment')();
var path = require('path');
var log = require(path.normalize(__dirname+'/log'));
log.info('Shortline server starting in '+environment+' mode');
var express = require('express');
var _ = require('underscore');
var adapter = require('./db/adapter');
var async = require('async');
var config = require('./config');
var Shortline = require('./model/shortline');

var server = express();

server.configure('development', function(){
  server.use(server.router);
  server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var short = new Shortline();

short.load_receivers(function(err){
  if(err) return process.exit();
  server.listen(config.port);
  log.info("Shortline (mode: "+environment+") started listening on TCP/" + config.port);
});

server.get('/', function(req, res){
  res.send("Welcome to Shortline.  Please read the <a href='https://github.com/tedsuo/Shortline'>documentation</a> to use.");
});

// create job
server.post('/:action', function(req, res){
  if(!_.include(config.trusted_ips, req.client.remoteAddress)){
    res.send("You are not authorized to push to Shortline.", 403);
    log.info('An unauthorized client tried to push to shortline from ip ' + req.client.remoteAddress);
    return;
  }

  var req_json_string = '';
  
  req.on('data', function(data){
    req_json_string += data;
  });

  req.on('end', function(){
    switch(req.params.action){
      case "push":
        short.push({
          receiver: req.get('X-Receiver-Name'),
          path: req.get('X-Path'),
          timeout: req.get('X-Timeout'),
          payload: req_json_string
        },function(err){
          if(err) return res.send(err.toString(), 500);
          res.end('Job saved. Good job!');
        });
    }
  });
});
