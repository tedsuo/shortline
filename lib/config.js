// #TODO: add -c cli option to specify config location
var fs = require('fs');
var argv = require('optimist').argv;
var default_jamboree_conffile = '/etc/jamboree.js';
var dir, conffile;
if(argv.config){ 
  dir = argv.config;
  if(dir.charAt(0) !== '/'){
    dir = process.cwd() + '/' + dir;
  }
} else if(process.env.JAMBOREE_CONFFILE != undefined) {
  conffile = process.env.JAMBOREE_CONFFILE;
} else {
  try{
    if(fs.statSync(default_jamboree_conffile)) conffile = default_jamboree_conffile;
  } catch(e){
    dir = process.cwd();
  }
}

if(conffile){
  module.exports = require(conffile);
} else {
  module.exports = require(dir+'/jb_config');
}
