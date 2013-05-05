// #TODO: add -c cli option to specify config location
var fs = require('fs');
var argv = require('optimist').argv;
var log = require('./log');

var GLOBAL_CONFFILE = '/etc/shortline.json';
var LOCAL_CONFFILE = process.cwd()+'/shortline.json';
var ENV_CONFFILE = process.env.SHORTLINE_CONFFILE;
var ARG_CONFFILE = argv.config;

var conffile;

// determine which conffile to use 

if(ARG_CONFFILE){ 
  
  conffile = argv.config;
  
} else if(ENV_CONFFILE != undefined) {

  conffile = ENV_CONFFILE;

} else {
  
  try{
    if(fs.statSync(LOCAL_CONFFILE)) conffile = LOCAL_CONFFILE;
  } catch(e){
    try{
      if(fs.statSync(GLOBAL_CONFFILE)) conffile = GLOBAL_CONFFILE;
    } catch(e){
      log.error("Cannot find config file.  Please run 'short install' to generate a configuration file.");
      process.exit();
    }
  }

}

if(conffile.charAt(0) !== '/') conffile = process.cwd() + '/' + conffile;

var json_string = fs.readFileSync(conffile,'UTF8');
module.exports = JSON.parse(json_string);
