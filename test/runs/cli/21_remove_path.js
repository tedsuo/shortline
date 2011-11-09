var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

async.series([
  function(next){
    console.log("Remove path removes the path");
    exec(BINPATH + ' ls -m test | grep somepath | wc -l', function(err, stdout){
      assert.equal(stdout.trim(), '1', "A path should exist before attemting to remove");
      exec(BINPATH + ' remove path testing somepath -m test', function(err, stdout){
        assert.notEqual(stdout.indexOf("You have removed this path."), -1, "Removing a path should display a confirmation message");
        exec(BINPATH + ' ls -m test | grep somepath | wc -l', function(err, stdout){
          assert.equal(stdout.trim(), '0', "Removed path should not remain in database");
          exec(BINPATH + ' remove receiver testing -m test', function(err, stdout){
            next();
          });
        });
      });
    });
  }
]);

