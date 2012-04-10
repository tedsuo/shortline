var assert = require('assert');
var async = require('async');
var exec = require('child_process').exec;
var BINPATH = require('../../test_config').BINPATH; 

var count_short_processes = 'ps aux | grep lib/server.js | grep -v grep | grep -v mobettah | grep -v vim | wc -l';

describe('CLI interface',function(){

  after(function(next){
    exec(count_short_processes, function(err, stdout){
      assert.equal(stdout.trim(),'1','Shortline process should exist before stop');
      exec(BINPATH + ' stop', function(err, stdout, stderr){
        exec(count_short_processes, function(err, stdout){
          assert.equal(stdout.trim(),'0','Shortline should not exist after stop');
          next();
        });
      });
    });
  });

  describe('remove all',function(){
    it("Remove all removes all records from the database",function(next){
      exec(BINPATH + ' remove all -m test', function(err, stdout, stderr){
        if(err) return next(err);
        assert.notEqual(stdout.indexOf("All records dropped from database."), -1, 'Removing all records should output confirmation');
        exec(BINPATH + ' ls -m test | wc -l', function(err, stdout){
          if(err) return next(err);
          assert.equal(stdout.trim(), '2', 'Records should not remain in database');
          next();
        });
      });
    });
  });

  describe('start', function(){

    it("should create a new shortline process", function(next){
      exec(count_short_processes, function(err, stdout){
        if(err) return next(err);
        assert.equal(stdout.trim(),'0','Shortline process should not exist before start');
        exec(BINPATH + ' start -m test', function(err, stdout, stderr){
          if(err) return next(err);
          exec(count_short_processes, function(err, stdout){
            if(err) return next(err);
            assert.equal(stdout.trim(),'1','Shortline process should exist after start');
            next();
          });
        });
      });
    });

    it('shouldn\'t create multiple shortline processes',function(next){
      exec(BINPATH + ' start -m test', function(err, stdout, stderr){
        exec(count_short_processes, function(err, stdout){
          assert.equal(stdout.trim(),'1','short start should not create multiple shortline processes');
          next();
        });
      });
    });
  });

  describe('add receiver', function(){
    it("should add a new receiver",function(next){
      exec(BINPATH + ' add receiver testing www.example.com -m test', function(err, stdout, stderr){
        assert.equal(err,null, 'short command should not return error');
        assert.notEqual(stdout.indexOf("You have saved this receiver."), -1, "short should send a confirmation message for saving receiver");
        exec(BINPATH + ' ls -m test | grep testing | wc -l', function(err, stdout){
          assert.equal(stdout.trim(), '1', "A receiver should have been added and listed");
          next();
        });
      });
    });
  });

  describe('remove receiver', function(){
    it("Remove receiver removes the receiver",function(next){
      exec(BINPATH + ' ls -m test | grep testing | wc -l', function(err, stdout){
        assert.equal(stdout.trim(), '1', "A receiver should exist before attemting to remove");
        exec(BINPATH + ' remove receiver testing -m test', function(err, stdout){
          assert.notEqual(stdout.indexOf("You have removed this receiver."), -1, "Removing a receiver should display a confirmation message");
          exec(BINPATH + ' ls -m test | grep testing | wc -l', function(err, stdout){
            assert.equal(stdout.trim(), '0', "Removed receiver should not remain in database");
            next();
          });
        });
      });
    });
  });

  describe('Add path', function(){
    it("should add a new path",function(next){
      exec(BINPATH + ' add receiver testing www.example.com -m test', function(err, stdout){
        exec(BINPATH + ' add path testing somepath some/path -m test', function(err, stdout, stderr){
          assert.equal(err,null, 'short command should not return error');
          assert.notEqual(stdout.indexOf("You have saved this path"), -1, "short should send a confirmation message for saving path");
          exec(BINPATH + ' ls -m test | grep somepath | wc -l', function(err, stdout){
            assert.equal(stdout.trim(), '1', "A path should have been added and listed");
            next();
          });
        });
      });
    });
  });

  describe('remove path', function(){
    it("Remove path removes the path",function(next){
      exec(BINPATH + ' ls -m test | grep somepath | wc -l', function(err, stdout){
        assert.equal(stdout.trim(), '1', "A path should exist before attemting to remove");
        exec(BINPATH + ' remove path testing somepath -m test', function(err, stdout){
          assert.notEqual(stdout.indexOf("You have removed this path."), -1, "Removing a path should display a confirmation message");
          exec(BINPATH + ' ls -m test | grep somepath | wc -l', function(err, stdout){
            assert.equal(stdout.trim(), '0', "Removed path should not remain in database");
            exec(BINPATH + ' remove receiver testing -m test', function(err, stdout){
              next();
            });
          });
        });
      });
    });
  });

  describe('update receiver', function(){
    it("should update the given receiver",function(next){
      exec(BINPATH + ' add receiver testing www.example.com -c 50 -m test', function(err, stdout, stderr){
        exec(BINPATH + ' update receiver testing -n newname -h new.example.com -c 30 -m test', function(err, stdout){
          assert.ifError(err);
          // assert.equal(err, null, "short should not give an error while updating");
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
    });
  });

  describe('update path', function(){
    it("should update the given path",function(next){
      exec(BINPATH + ' add receiver testing www.example.com -m test', function(err, stdout, stderr){
        exec(BINPATH + ' add path testing somepath some/path -t 5000 -m test', function(err, stdout, stderr){
          exec(BINPATH + ' update path testing somepath -n newpathname -u some/newpath -t 1000 -m test', function(err, stdout){
            assert.equal(err, null, "short should not give an error while updating");
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
    });
  });
});
