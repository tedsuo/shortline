var spawn = require('child_process').spawn;
var fs = require('fs');
var async = require('async');
var _ = require('underscore');

var run_test = function(test_path, done){
  var test = spawn('node',[test_path]);
  console.log("Performing test:", test_path);
  test.stdout.on('data', function(data){
    process.stdout.write(test_path+" stdout: "+data);
  });
  test.stderr.on('data', function(data){
    process.stderr.write(test_path+" stderr: "+data);
  });
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
          if(err){
            console.log(err);
            return err;
          }
          if(stat.isDirectory()){
            add_to_tests(dirname+elem+'/', function(){
              done();
            });
          } else {
            var elem_split = elem.split(".");
            if(elem_split[elem_split.length - 1] == "js"){
              tests.push(function(next){
                run_test(dirname+elem, next);
              });
            }
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
