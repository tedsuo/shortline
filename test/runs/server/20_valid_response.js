var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var config = require('../../../config');
var BINPATH = require('../../test_config').BINPATH;

async.series([
  function(next){
    console.log("Server responds to valid receiver and path");
    exec(BINPATH + ' add receiver testing localhost -p 8010 -m test', function(err, stderr){
      exec(BINPATH + ' add path testing somepath some/path -m test', function(err, stderr){
        exec("curl -d '{}' http://localhost:"+config.port+"/testing/somepath", function(err, stdout){
          assert.notEqual(stdout.indexOf("Job saved. Good job!"), -1, "Valid receivers should display a confirmation.");
          exec(BINPATH + ' remove receiver testing -m test', function(err, stderr){
            next();
          });
        });
      });
    });
  }
]);
