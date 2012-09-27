var mongoose = require('mongoose');
var environment = require('../../environment')();
var Schema = mongoose.Schema;
var config = require('../../config');
var EventEmitter = require('events').EventEmitter;
var log = require('../../../lib/log');
exports.emitter = new EventEmitter();

var mongo_db = "mongodb://";

if(config.db[environment].user && config.db[environment].password){
  mongo_db += config.db[environment].user+":"+config.db[environment].password+"@";
}

var hosts_array = [];
for(x in config.db[environment].hosts){
  var host_string = config.db[environment].hosts[x].host;
  host_string += config.db[environment].hosts[x].port ? ":"+config.db[environment].hosts[x].port : "";
  hosts_array.push(host_string);
}
mongo_db += hosts_array.join(",")+"/"+config.db[environment].database;

log.info('connecting to '+mongo_db);
mongoose.connect(mongo_db);
mongoose.connection.on('open', function(){
  exports.emitter.emit('open');
  log.info('connection opened to '+mongo_db);
});

var Receiver = new Schema({
  name: String,
  host: String,
  ip: String,
  port: Number,
  concurrency: Number
});

Receiver.statics.find_by_name = function(name, cb){
  this.findOne({ name: name }, function(err,doc){
    if(err) { 
      cb(err);
    } else {
      if(doc == undefined) {
        cb('No such receiver found');
      } else {
        cb(null, doc);
      }
    }
  })
};

exports.Receiver = mongoose.model('Receiver', Receiver);

var ObjectId = Schema.ObjectId;

var Job = new Schema({
  path: String,
  payload: String,
  host: String,
  port: Number,
  receiver_id: ObjectId,
  receiver_name: String,
  timeout: Number,
  status: String,
  updated: Date
});

Job.methods.setStatus = function(status, callback){
  this.status = status;
  this.updated = Date.now();
  var j = this;
  this.save(function(err){
    if(err){
      j.emit('job_save_error');
      if(callback) callback(err);
    } else {
      j.emit('job_saved');
      if(callback) callback(null);
    }
  });
};

exports.Job = mongoose.model('Job', Job);
