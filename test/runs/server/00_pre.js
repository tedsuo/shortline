var async = require('async');
var exec = require('child_process').exec;
var BINPATH = '../bin/jb';

async.parallel([
  function(done){
    exec(BINPATH + " start -m test", function(err){
      done();  
    });
  }
]);
