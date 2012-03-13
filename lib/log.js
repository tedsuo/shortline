var fs = require('fs');
var path = require('path');
var Log = require('log');

var info_stream, error_stream, info, error;

if(process.env['NODE_ENV'] == 'test'){
  info_stream = fs.createWriteStream(path.join(__dirname,'..','test','test_info.log'));
  error_stream = fs.createWriteStream(path.join(__dirname,'..','test','test_error.log'));
} else{
  info_stream = process.stdout;
  error_stream = process.stderr;
}

info = new Log('info',info_stream);
error = new Log('error',error_stream)

exports.info = info.info.bind(info);
exports.error = error.error.bind(error);