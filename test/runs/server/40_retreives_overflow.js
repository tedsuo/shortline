var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var express = require('express');
var config = require('../../../config');
var BINPATH = require('../../test_config').BINPATH;

var endpoint = express.createServer();

var endpoint_reached_count = 0;
var global_next;

endpoint.post('/some/overflow', function(req, res){
  endpoint_reached_count++;
  if(endpoint_reached_count == 29){
    global_next();
  }
  setTimeout(function(){
    res.end('got it');
  }, 250);
});

endpoint.listen(8010);

function delete_receiver_path(callback){
  exec(BINPATH + ' remove receiver testoverflow -m test', function(){
    callback();
  });
}

async.series([
  function(next){
    global_next = next;
    console.log("Server retreives and completes overflow jobs from db");
    exec(BINPATH + ' add receiver testoverflow localhost -p 8010 -c 2 -m test', function(){
      exec(BINPATH + ' add path testoverflow someoverflow some/overflow -m test', function(){
        var curl_request_functions = [];
        for(var x = 0; x < 30; x++){
          curl_request_functions.push(function(done){
            exec("curl -d '{}' http://localhost:"+config.port+"/testoverflow/someoverflow", function(){
              done();
            });
          });
        }
        async.parallel(curl_request_functions, function(){
          setTimeout(function(){
            delete_receiver_path(function(){
              assert.fail(false, false, 'All jobs not complete within 4 seconds.');
            });
          }, 4000);
        });
      });
    });
  }
], function(err, results){
  delete_receiver_path(function(){
    process.exit();
  });
});
