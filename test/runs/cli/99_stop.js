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
    exec('ps aux | grep job_board.js | grep -v grep | grep -v mobettah | grep -v vim | wc -l', function(err, stdout){
      assert.equal(stdout.trim(),'1','Job board process should exist before stop');
      exec(BINPATH + ' stop', function(err, stdout, stderr){
        exec('ps aux | grep job_board.js | grep -v grep | grep -v mobettah | grep -v vim | wc -l', function(err, stdout){
          assert.equal(stdout.trim(),'0','Job board should not exist after stop');
          next();
        });
      });
    });
  }
]);
