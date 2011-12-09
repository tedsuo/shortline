var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var mongo_db = null;
switch(process.env.NODE_ENV){
  case "test":
    mongo_db = "mongodb://localhost/jobboard_test";
    break;
  case "production":
    mongo_db = 'mongodb://localhost/jobboard_production';
    break;
  default:
    mongo_db = "mongodb://localhost/jobboard_development";
    break;
}
mongoose.connect(mongo_db);

var Path = new Schema({
  name: String,
  url: String,
  timeout: Number
});

var Receiver = new Schema({
  name: String,
  host: String,
  ip: String,
  port: String,
  concurrency: String,
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

var Job = new Schema({
  path     : String,
  payload : String,
  host : String,
  port: String,
  receiver: [Receiver],
  timeout : Number,
  status: String
//  attempts: Number
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

Job.methods.remove_listeners = function(){
  this.removeAllListeners();
};

exports.Job = mongoose.model('Job', Job);
