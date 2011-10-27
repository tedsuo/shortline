var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '/usr/bin/jb';

module.exports = {
  'Start creates new job board process': function(){
    var pid_file = '/var/run/job_board.pid';
    fs.stat(pid_file, function(err,stats){
      assert.isNotNull(err,'pid_file should not exist before start');
      exec(BINPATH + ' start -m development', function(err, stdout, stderr){
        fs.readFile(pid_file, function(err, data) {
          assert.isNull(err,'pid_file should exist after start')
          pid = data.trim();
          exec('ps -p ' + pid + ' | wc -l', function(err,stdout,stderr){
            assert.isEqual(stdout.trim(), '2', 'job_board process should exist');
          });
        });
      });
    });
  },
  'Start doesnt create multiple job board proccesses': function(){
  }
};
