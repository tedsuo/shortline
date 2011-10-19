var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect(process.env.MONGO_CONNECT || 'mongodb://localhost/jobboard');

var Receiver = new Schema({
  name: String,
  host: String,
  port: String,
  concurrency: String,
  paths: [] // path: { name: String, url:String, timeout: Number }
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

}
exports.Receiver = mongoose.model('Receiver', Receiver);

var Job = new Schema({
  path     : String,
  payload : String,
  host : String,
  port: String,
  receiver: [Receiver],
  timeout : Number
});
exports.Job = mongoose.model('Job', Job);
