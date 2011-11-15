var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var express = require('express');
var BINPATH = '../bin/jb';

var endpoint = express.createServer();
var global_next;

endpoint.get('/some/path', function(req, res){
  global_next();
})

async.series([
  function(next){
    global_next = next;
    console.log("Server reaches a valid endpoint");
    exec(BINPATH + ' add receiver testing localhost -p 8010 -m test', function(err, stderr){
      exec(BINPATH + ' add path testing somepath some/path -m test', function(err, stderr){
        exec("curl -d '{}' http://localhost:8009/testing/somepath", function(err, stdout){
          assert.notEqual(stdout.indexOf("Job saved. Good job!"), -1, "Valid receivers should display a confirmation.");
          exec(BINPATH + ' remove receiver testing -m test', function(err, stderr){
            next();
          });
        });
      });
    });
  }
]);
