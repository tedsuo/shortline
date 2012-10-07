// #TODO: add -c cli option to specify config location
var fs = require('fs');
var argv = require('optimist').argv;
var global_shortline_conffile = '/etc/shortline.js';
var local_shortline_conffile = process.cwd()+'/shortline_config.js';
var dir, conffile;
var log = require('./log');

if(argv.config){ 
  conffile = argv.config;
  if(conffile.charAt(0) !== '/'){
    conffile = process.cwd() + '/' + dir;
  }
} else if(process.env.SHORTLINE_CONFFILE != undefined) {
  conffile = process.env.SHORTLINE_CONFFILE;
} else {
  try{
    if(fs.statSync(local_shortline_conffile)) conffile = local_shortline_conffile;
  } catch(e){
    try{
      if(fs.statSync(global_shortline_conffile)) conffile = global_shortline_conffile;
    } catch(e){
      log.error("Cannot find config file.  Please run 'short install' to generate a configuration file.");
      process.exit();
    }
  }
}

if(conffile){
  module.exports = require(conffile);
}
