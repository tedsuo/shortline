var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var BINPATH = '../bin/jb';

async.series([
  function(next){
    console.log("Update receiver updates the given receiver");
    exec(BINPATH + ' add receiver testing www.example.com -c 50 -m test', function(err, stdout, stderr){
      exec(BINPATH + ' update receiver testing -n newname -h new.example.com -c 30 -m test', function(err, stdout){
        assert.equal(err, null, "jb should not give an error while updating");
        assert.notEqual(stdout.indexOf("You have updated this receiver."), -1, "Updating receiver should output a confirmation message.");
        async.parallel([
          function(done){
            exec(BINPATH + ' ls -m test | grep -A 3 newname | egrep "Host.*new\\.example\\.com" | wc -l', function(err, stdout){
              assert.equal(stdout.trim(), '1', "The host of the receiver should have changed");
              done();
            });
          },
          function(done){
            exec(BINPATH + ' ls -m test | grep -A 3 newname | egrep "Concurrency.*30" | wc -l', function(err, stdout){
              assert.equal(stdout.trim(), '1', "The concurrency of the receiver should have changed");
              done();
            });
          }
        ], function(err, result){
          exec(BINPATH + ' remove receiver newname -m test', function(err, stdout){
            next();
          });
        }
        );
      });
    });
  }
]);

