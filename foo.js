process.env.NODE_ENV = 'test';
var JobBoard = require('./lib/model/job_board');
var models = require('./lib/db/mongo/models.js');

var jb = new JobBoard();

var q = models.Job.find({
  'receiver_id':'4f62880301c7cd0000000002'
});

q.execFind(function(err, jobs){
  console.log("model call: ",jobs.length);
});

jb.find_jobs_by_receiver_id('4f62880301c7cd0000000002',{},function(err,jobs){
  console.log(jobs.length);
});
