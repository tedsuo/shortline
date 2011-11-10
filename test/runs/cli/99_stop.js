var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

var pid = null;
var pid_file = '/var/run/job_board.pid';

async.series([
  function(next){
    console.log("Stop destroys job board process");
    fs.readFile(pid_file, function(err,data){
      assert.equal(err,null,'pid_file should exist before stop');
      pid = data.toString().trim();
      exec(BINPATH + ' stop', function(err, stdout, stderr){
        fs.stat(pid_file, function(err, stat) {
          assert.notEqual(err,null,'pid_file should not exist after stop');
          exec('ps -p ' + pid + ' | wc -l', function(err,stdout,stderr){
            assert.equal(stdout.trim(), '1', 'job_board process should not exist');
            next();
          });
        });
      });
    });
  }
]);
