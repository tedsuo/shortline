var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

async.series([
  function(next){
    console.log("Remove receiver removes the receiver");
    exec(BINPATH + ' ls -m test | grep testing | wc -l', function(err, stdout){
      assert.equal(stdout.trim(), '1', "A receiver should exist before attemting to remove");
      exec(BINPATH + ' remove receiver testing -m test', function(err, stdout){
        assert.notEqual(stdout.indexOf("You have removed this receiver."), -1, "Removing a receiver should display a confirmation message");
        exec(BINPATH + ' ls -m test | grep testing | wc -l', function(err, stdout){
          assert.equal(stdout.trim(), '0', "Removed receiver should not remain in database");
          next();
        });
      });
    });
  }
]);

