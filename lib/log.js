var fs = require('fs');
var path = require('path');
var Log = require('log');

var LOG_PATH = path.join(__dirname,'..','test','log');

var info, error, debug;
if(process.env['NODE_ENV'] == 'test'){
  info = new Log('info',
    fs.createWriteStream(path.join(LOG_PATH,'info.log'), {flags:'a'})
  );
  debug = new Log('debug',
    fs.createWriteStream(path.join(LOG_PATH,'debug.log'), {flags:'a'})
  );

  var export_fs = fs.openSync(path.join(LOG_PATH,'error.log'), 'a');

  exports.info = info.info.bind(info);
  exports.debug = debug.debug.bind(debug);
  exports.error = function(error){
    fs.writeSync(export_fs, "[" + new Date + "] ERROR "+error+"\n");
  };
} else{
  info = new Log('info', process.stdout);
  error = new Log('error',process.stderr);
  debug = {
    debug: function() {
      // no-op
    }
  };

  exports.info = info.info.bind(info);  // srsly?
  exports.debug = debug.debug.bind(debug);
  exports.error = error.error.bind(error);
}

