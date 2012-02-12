var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var config = require('../../../config');
var BINPATH = require('../../test_config').BINPATH;

async.series([
  function(next){
    console.log("Server displays error for false receiver");
    exec("curl -d '{}' http://localhost:"+config.port+"/false/somepath", function(err, stdout){
      assert.notEqual(stdout.indexOf("No receiver by that name found."), -1, "False receivers should display an error");
      next();
    });
  },
  function(next){
    console.log("Server displays error for false path");
    exec(BINPATH + " add receiver somerecv test.com -m test", function(err, stdout){
      exec("curl -d '{}' http://localhost:"+config.port+"/somerecv/blah", function(err, stdout){
        assert.notEqual(stdout.indexOf("No path by that name found."), -1, "False paths should display an error.");
        exec(BINPATH + " remove receiver somerecv -m test", function(err, stdout){
          next();
        });
      });
    });
  }
]);

