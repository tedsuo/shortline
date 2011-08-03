/*
  start job board on port 4001
  add job add_test which points at localhost:4002
  send job request to 4001
  receive job response on 4002
*/
JB_PORT = 4001;
JB_PATH = __dirname+'/../job_board.js';
JB_STDOUT_LOG = __dirname+'/tmp/jb_stdout.log';
JB_STDERR_LOG = __dirname+'/tmp/jb_stderr.log';

spawn = require('child_process').spawn
assert = require('assert');
fs = require('fs');

var log = fs.createWriteStream(JB_STDOUT_LOG);  
var err_log = fs.createWriteStream(JB_STDERR_LOG);
jb = spawn(JB_PATH,['-p',JB_PORT]);
jb.stdout.pipe(log);
jb.stderr.pipe(err_log);

test_add_job();

function test_add_job(){
  console.log('testing....'); 
}
