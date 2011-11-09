var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

async.series([
  function(next){
    console.log("Update path updates the given path");
    exec(BINPATH + ' add receiver testing www.example.com -m test', function(err, stdout, stderr){
      exec(BINPATH + ' add path testing somepath some/path -t 5000 -m test', function(err, stdout, stderr){
        exec(BINPATH + ' update path testing somepath -n newpathname -u some/newpath -t 1000 -m test', function(err, stdout){
          assert.equal(err, null, "jb should not give an error while updating");
          assert.notEqual(stdout.indexOf("You have updated this path."), -1, "Updating path should output a confirmation message.");
          async.parallel([
            function(done){
              exec(BINPATH + ' ls -m test | grep -A 2 newpathname | egrep "Timeout.*1000" | wc -l', function(err, stdout){
                assert.equal(stdout.trim(), '1', "The timeout of the path should have changed");
                done();
              });
            },
            function(done){
              exec(BINPATH + ' ls -m test | grep -A 2 newpathname | egrep "URL.*some/newpath" | wc -l', function(err, stdout){
                assert.equal(stdout.trim(), '1', "The URL of the path should have changed");
                done();
              });
            }
          ], function(err, result){
            exec(BINPATH + ' remove receiver testing -m test', function(err, stdout){
              next();
            });
          }
          );
        });
      });
    });
  }
]);

