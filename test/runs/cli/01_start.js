var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

var pid = null;
var pid_file = '/var/run/job_board.pid';

async.series([
  function(next){
    console.log("Start creates new job board process");
    fs.stat(pid_file, function(err,stats){
      assert.notEqual(err,null,'pid_file should not exist before start');
      exec(BINPATH + ' start -m test', function(err, stdout, stderr){
        fs.readFile(pid_file, function(err, data) {
          assert.equal(err,null,'pid_file should exist after start')
          pid = data.toString().trim();
          exec('ps -p ' + pid + ' | wc -l', function(err,stdout,stderr){
            assert.equal(stdout.trim(), '2', 'job_board process should exist');
            next();
          });
        });
      });
    });
  },
  function(next){
    console.log('Start doesn\'t create multiple job board processes');
    exec(BINPATH + ' start -m test', function(err, stdout, stderr){
      fs.readFile(pid_file, function(err, data) {
        assert.equal(err,null,'pid_file should exist');
        assert.equal(data.toString().trim(), pid, 'pid_file should not have changed');
        next();
      });
    });
  }
]);

