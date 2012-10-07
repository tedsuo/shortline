var assert = require('assert');
var fs = require('fs');
var global_shortline_conffile = '/etc/shortline.js';
var local_shortline_conffile = process.cwd()+'/shortline_config.js';
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var path = require('path');
var BINPATH = require('../../test_config').BINPATH; 

describe('Config test preconditions',function(){
  it('no conffiles should be present', function(){
    assert.throws(function(){
        fs.statSync(local_shortline_conffile);
      },
      Error,
      local_shortline_conffile+' exists.  Please rename or delete to run test'
    );
    assert.throws(function(){
        fs.statSync(global_shortline_conffile);
      },
      Error,
      global_shortline_conffile+' exists.  Please rename or delete to run test'
    );
  });
});

describe('Config', function(){
  it('should display error to the user', function(done){
    var info_file = path.join(__dirname,'..','..','log','error.log');
    var watch = spawn('tail', ['-f',info_file,'-n','0']);
    watch.stdout.on('data', function(data){
      if(~data.toString().indexOf("Cannot find config file.")) done();
    });
    exec(BINPATH + ' stop', function(){
      done("No error is displayed to the user");
    });
  });
});
