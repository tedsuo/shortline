var fs = require('fs');
var path = require('path');
var Log = require('log');

var LOG_PATH = path.join(__dirname,'..','test','log');

var info, error, debug;

if(process.env['NODE_ENV'] == 'test'){
  info = new Log('info',
    fs.createWriteStream(path.join(LOG_PATH,'info.log'), {flags:'a'})
  );
  error = new Log('error',
    fs.createWriteStream(path.join(LOG_PATH,'error.log'), {flags:'a'})
  );
  debug = new Log('debug',
    fs.createWriteStream(path.join(LOG_PATH,'debug.log'), {flags:'a'})
  );
} else{
  info = new Log('info', process.stdout);
  error = new Log('error',process.stderr);
  debug = {
    debug: function() {
      // no-op
    }
  };
}

exports.info = info.info.bind(info);  // srsly?
exports.error = error.error.bind(error);
exports.debug = debug.debug.bind(debug);
