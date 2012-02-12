var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = require('../../test_config').BINPATH;

var pid = null;
var pid_file = '/var/run/job_board.pid';

async.series([
  function(next){
    console.log("Start creates new job board process");
    exec('ps aux | grep job_board.js | grep -v grep | grep -v mobettah | grep -v vim | wc -l', function(err, stdout){
      assert.equal(stdout.trim(),'0','Job board process should not exist before start');
      exec(BINPATH + ' start -m test', function(err, stdout, stderr){
        exec('ps aux | grep job_board.js | grep -v grep | grep -v mobettah | grep -v vim | wc -l', function(err, stdout){
          assert.equal(stdout.trim(),'1','Job board process should exist after start');
          next();
        });
      });
    });
  },
  function(next){
    console.log('Start doesn\'t create multiple job board processes');
    exec(BINPATH + ' start -m test', function(err, stdout, stderr){
      exec('ps aux | grep job_board.js | grep -v grep | grep -v mobettah | grep -v vim | wc -l', function(err, stdout){
        assert.equal(stdout.trim(),'1','jb start should not create multiple job board processes');
        next();
      });
    });
  }
]);

