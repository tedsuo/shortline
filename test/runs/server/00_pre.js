var async = require('async');
var exec = require('child_process').exec;
var BINPATH = require('../../test_config').BINPATH;

async.parallel([
  function(done){
    exec(BINPATH + " start -m test", function(err){
      done();  
    });
  }
]);
