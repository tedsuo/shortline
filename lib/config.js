// #TODO: add -c cli option to specify config location
var argv = require('optimist').argv;
var dir;
if(argv.config){ 
  dir = argv.config;
  if(dir.charAt(0) !== '/'){
    dir = process.cwd() + '/' + dir;
  }
} else {
  dir = process.cwd();
}
module.exports = require(dir+'/jb_config');
