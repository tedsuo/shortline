var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var BINPATH = require('../../test_config').BINPATH; 

async.series([
  function(next){
    console.log("Remove all removes all records from the database");
    exec(BINPATH + ' remove all -m test', function(err, stdout, stderr){
      assert.ifError(err); 
      assert.notEqual(stdout.indexOf("All records dropped from database."), -1, 'Removing all records should output confirmation');
      exec(BINPATH + ' ls -m test | wc -l', function(err, stdout){
        assert.equal(stdout.trim(), '2', 'Records should not remain in database');
        next();
      });
    });
  }
]);

