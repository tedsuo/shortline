var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = require('../../test_config').BINPATH;

async.series([
  function(next){
    console.log("Add path adds a new path");
    exec(BINPATH + ' add receiver testing www.example.com -m test', function(err, stdout){
      exec(BINPATH + ' add path testing somepath some/path -m test', function(err, stdout, stderr){
        assert.equal(err,null, 'jb command should not return error');
        assert.notEqual(stdout.indexOf("You have saved this path"), -1, "jb should send a confirmation message for saving path");
        exec(BINPATH + ' ls -m test | grep somepath | wc -l', function(err, stdout){
          assert.equal(stdout.trim(), '1', "A path should have been added and listed");
          next();
        });
      });
    });
  }
]);

