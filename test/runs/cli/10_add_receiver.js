var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

async.series([
  function(next){
    console.log("Add receiver adds a new receiver");
    exec(BINPATH + ' add receiver testing www.example.com -m test', function(err, stdout, stderr){
      assert.equal(err,null, 'jb command should not return error');
      assert.notEqual(stdout.indexOf("You have saved this receiver."), -1, "jb should send a confirmation message for saving receiver");
      exec(BINPATH + ' ls -m test | grep testing | wc -l', function(err, stdout){
        assert.equal(stdout.trim(), '1', "A receiver should have been added and listed");
        next();
      });
    });
  }
]);

