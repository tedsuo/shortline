var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var express = require('express');
var BINPATH = '../bin/jb';

var endpoint = express.createServer();
var endpoint_reached = false;
var global_next;

endpoint.post('/some/path', function(req, res){
  endpoint_reached = true;
  global_next();
});

endpoint.listen(8010);

function delete_receiver_path(callback){
  exec(BINPATH + ' delete receiver testing', function(){
    callback();
  });
}

async.series([
  function(next){
    global_next = next;
    console.log("Server reaches a valid endpoint");
    exec(BINPATH + ' add receiver testing localhost -p 8010 -m test', function(){
      exec(BINPATH + ' add path testing somepath some/path -m test', function(){
        exec("curl -d '{}' http://localhost:8009/testing/somepath", function(err, stdout){
          assert.notEqual(stdout.indexOf("Job saved. Good job!"), -1, "Valid receivers should display a confirmation.");
          exec(BINPATH + ' remove receiver testing -m test', function(err, stderr){
            setTimeout(function(){
              delete_receiver_path(function(){
                assert.fail(false, false, 'Endpoint not reached within 6 seconds.');
              });
            }, 6000);
          });
        });
      });
    });
  }
], function(err, results){
  delete_receiver_path(function(){
    process.exit();
  });
});
