var mongoose = require('mongoose');
var environment = require('../environment')(process.env.NODE_ENV);
var Schema = mongoose.Schema;
var config = require('../../config');
var EventEmitter = require('events').EventEmitter;

exports.emitter = new EventEmitter();

mongo_db = "mongodb://";
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

mongoose.connect(mongo_db);

mongoose.connection.on('open', function(){
  exports.emitter.emit('open');
});

var Path = new Schema({
  name: String,
  url: String,
  timeout: Number
});

var Receiver = new Schema({
  name: String,
  host: String,
  ip: String,
  port: Number,
  concurrency: Number,
  paths: [Path]
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
  path     : String,
  payload : String,
  host : String,
  port: Number,
  receiver_id: ObjectId,
  timeout : Number,
  status: String
});

Job.methods.setStatus = function(status, callback){
  this.status = status;
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
