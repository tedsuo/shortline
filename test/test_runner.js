var spawn = require('child_process').spawn;
var fs = require('fs');
var async = require('async');
var _ = require('underscore');

var run_test = function(test_path, done){
  var test = spawn('node',[test_path]);
  console.log("Performing test:", test_path);
  test.stdout.pipe(process.stdout);
  test.stderr.pipe(process.stderr);
  test.on('exit',function(){
    done();
  });
};

tests = [];

function add_to_tests(dirname, cb){
  fs.readdir(dirname, function(err, list){
    if(err) return err;
    var rec_list = [];
    _.each(list, function(elem){
      rec_list.push(function(done){
        fs.stat(dirname+elem, function(err, stat){
          console.log("stating " +dirname+elem);
          if(err){
            console.log(err);
            return err;
          }
          if(stat.isDirectory()){
            add_to_tests(dirname+elem+'/', function(){
              done();
            });
          } else {
            console.log('pushing '+dirname+elem);
            tests.push(function(next){
              run_test(dirname+elem, next);
            });
            done();
          }
        });
      });
    });
    async.parallel(rec_list, function(){
      cb();
    });
  });
}

add_to_tests(__dirname+"/runs/", function(){
  async.series(tests);
});

function perform_tests(){
}
