var ROOT = require('../../test_config').ROOT;
var JobBoard = require(ROOT+'lib/model/job_board');
var db = require(ROOT+'lib/db/adapter');
var assert = require('assert');
var async = require('async');
var fix = require(ROOT+'test/fixtures');
var jb;


describe('JobBoard',function(){

  before(function(){
    jb = new JobBoard();
  });

  beforeEach(function(done){
    jb.remove_all(function(err){
      if(err) return done(err);
      done();
    });
  });

  describe('remove_all', function(){
    var receiver = fix.receiver();

    beforeEach(function(done){
      jb.add_receiver(receiver,function(err,q){
        if(err) return done(err);
        jb.remove_all(function(err){
          if(err) return done(err);
          done();
        });
      });
    });

    it('removed receiver should no longer be in database',function(done){
      db.find_receiver_by_name(receiver.name,function(err,r){
        assert.ok( err instanceof Error);
        assert.equal( r, undefined);
        done();
      });
    });
  });

  describe('load_receivers', function(){
    it('should add all available receivers', function(done){
      async.parallel([
        function(next){
          jb.add_receiver(fix.receiver(),next);
        },
        function(next){
          jb.add_receiver(fix.receiver(),next);
        },
        function(next){
          jb.add_receiver(fix.receiver(),next);
        }
      ],function(){
        var jb2 = new JobBoard();
        assert.equal(jb2.count_receivers(),0);
        jb2.load_receivers(function(err){
          if(err) return done(err);
          assert.equal(jb2.count_receivers(),3);
          done();
        });
      });
    });
  });

  describe('count_receivers', function(){
    it('should count all currently loaded receivers', function(done){
      assert.equal(jb.count_receivers(),0);
      
      async.parallel([
        function(next){
          jb.add_receiver(fix.receiver(),next);
        },
        function(next){
          jb.add_receiver(fix.receiver(),next);
        },
        function(next){
          jb.add_receiver(fix.receiver(),next);
        }
      ],function(){
        assert.equal(jb.count_receivers(),3);
        done();
      });
    });
  });

  describe('get_receiver', function(){
    it("should find receiver by name", function(done){
      var fixture = fix.receiver();
      jb.add_receiver(fixture, function(){
        var jb2 = new JobBoard();
        jb2.get_receiver(fixture.name,function(err,receiver){
          if(err) return done(err);
          assert.equal(receiver.name,fixture.name);
          done();
        });
      });
    });
  });

  describe('add_receiver', function(){
    var queue;
    var fixture = fix.receiver();

    beforeEach(function(done){
      jb.add_receiver(fixture,function(err,q){
        if(err) return done(err);
        queue = q;
        done();
      });
    });

    it('new receiver should be in database',function(done){
      db.find_receiver_by_name(fixture.name,function(err,receiver){
        if(err) return done(err);
        Object.keys(fixture).forEach(function(key){
          assert.equal(receiver[key],queue[key]);
        });
        done();
      });
    });

    it('new receiver should be loaded',function(){
      assert.deepEqual(jb.queues[queue.name], queue);
    });
  });

  describe('update_receiver', function(){
    var queue;
    var fixture = fix.receiver();
    var new_fixture = fix.receiver();

    beforeEach(function(done){
      jb.add_receiver(fixture,function(err,q){
        if(err) return done(err);
        jb.update_receiver(fixture.name,new_fixture,function(err,q){
          if(err) return done(err);
          queue = q;
          done();
        });
      });
    });

    it('should update receiver in database',function(done){
      db.find_receiver_by_name(new_fixture.name,function(err,receiver){
        if(err) return done(err);
        Object.keys(fixture).forEach(function(key){
          assert.equal(receiver[key],queue[key]);
        });
        done();
      });
    });

    it('should update job processor',function(done){
      assert.equal(jb.queues[new_fixture.name].name, new_fixture.name);
      assert.equal(jb.queues[fixture.name],undefined)
      done();
    });
  });

  describe('remove_receiver', function(){
    var queue;
    var fixture = fix.receiver();

    beforeEach(function(done){
      jb.add_receiver(fixture,function(err,q){
        if(err) return done(err);
        jb.remove_receiver(fixture.name,function(err){
          if(err) return done(err);
          done();
        });
      });
    });

    it('receiver should not be in database',function(done){
      db.find_receiver_by_name(fixture.name,function(err,receiver){
        assert.ok( err instanceof Error);
        assert.equal( receiver, undefined);
        done();
      });
    });
  });


  describe('add_path', function(){
    var queue;
    var receiver = fix.receiver();
    var path = fix.path();

    beforeEach(function(done){
      jb.add_receiver(receiver,function(err,q){
        if(err) return done(err);
        jb.add_path(q.name,path,function(err){
          if(err) return done(err);
          done();
        });
      });
    });

    it('path should be in memory',function(done){
      jb.get_receiver(receiver.name,function(err,receiver){
        if(err) return done(err);
        assert.equal(receiver.paths[path.name].name, path.name);
        done();
      });
    });

    it('path should be in database',function(done){
      var jb2 = new JobBoard();
      jb2.get_receiver(receiver.name,function(err,receiver){
        if(err) return done(err);
        assert.equal(receiver.paths[path.name].name, path.name);
        done();
      });
    });
  });

  describe('update_path', function(){
    var queue;
    var receiver = fix.receiver();
    var path = fix.path();
    var path2 = fix.path();

    beforeEach(function(done){
      jb.add_receiver(receiver,function(err,q){
        if(err) return done(err);
        jb.add_path(q.name,path,function(err){
          if(err) return done(err);
          jb.update_path(q.name,path.name,path2,function(err){
            if(err) return done(err);
            done();
          });
        });
      });
    });

    it('path should be updated in memory',function(done){
      jb.get_receiver(receiver.name,function(err,receiver){
        if(err) return done(err);
        assert.equal(receiver.paths[path2.name].name, path2.name);
        done();
      });
    });

    it('path should be updated in database',function(done){
      var jb2 = new JobBoard();
      jb2.get_receiver(receiver.name,function(err,receiver){
        if(err) return done(err);
        assert.equal(receiver.paths[path2.name].name, path2.name);
        done();
      });
    });
  });

describe('remove_path', function(){
    var queue;
    var receiver = fix.receiver();
    var path = fix.path();

    beforeEach(function(done){
      jb.add_receiver(receiver,function(err,q){
        if(err) return done(err);
        jb.add_path(q.name,path,function(err){
          if(err) return done(err);
          jb.remove_path(q.name,path.name,function(err){
            if(err) return done(err);
            done();
          });
        });
      });
    });

    it('path should be removed from memory',function(done){
      jb.get_path( receiver.name, path.name, function(err,path){
        assert.equal(path,undefined);
        assert.ok(err);
        done();
      });
    });

    it('path should be removed from database',function(done){
      var jb2 = new JobBoard();
      jb2.get_path( receiver.name, path.name, function(err,path){
        assert.equal(path,undefined);
        assert.ok(err);
        done();
      });
    });
  });

  describe('get_path', function(){
    var receiver = fix.receiver();
    var path = fix.path();

    beforeEach(function(done){
      jb.add_receiver(receiver,function(err,q){
        if(err) return done(err);
        jb.add_path(q.name,path,function(err){
          if(err) return done(err);
          done();
        });
      });
    });

    it("should find path by name from memory", function(done){
      jb.get_path(receiver.name,path.name,function(err,result){
        if(err) return done(err);
        assert.equal(result.name,path.name);
        done();
      });
    });

    it("should find path by name from db", function(done){
      var jb2 = new JobBoard();
      jb2.get_path(receiver.name,path.name,function(err,result){
        if(err) return done(err);
        assert.equal(result.name,path.name);
        done();
      });
    });

  });
  
  describe('jobs', function(){
    var receiver, job_options, jobs, next;

    beforeEach(function(done){
      jb.add_receiver(fix.receiver(),function(err,r){
        if(err) return done(err);
        
        receiver = r;

        job_options = {
          receiver_id:receiver.id,
          receiver_name:receiver.name,
          status: 'queued'
        };

        jobs = [
          fix.job(job_options),
          fix.job(job_options),
          fix.job(job_options)
        ];

        next = (function(){
          var i = 0;
          var max = jobs.length;
          return function(err){
            ++i;
            if(i == max) done(err);
          }
        })();

        jobs.forEach(function(job){
          jb.create_job(job,function(err,job){
            if(err) return next(err);
            next(null,job);
          });
        });
      });
    });

    it('should create and retrieve jobs',function(done){
      var job = jb.create_job(fix.job(job_options),function(err,job){
        if(err) return done(err);
        jb.get_job(job._id,function(err,retrieved_job){
          if(err) return done(err);
          assert.equal(job.payload,retrieved_job.payload);
          done();
        });        
      });
    });

    it("should find jobs by receiver id", function(done){
      jb.find_jobs_by_receiver_id(receiver.id,null,function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });

    it("should find jobs by receiver id from db", function(done){
      var jb2 = new JobBoard();
      jb2.find_jobs_by_receiver_id(receiver.id,{},function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });

    it("should find jobs by receiver name", function(done){
      jb.find_jobs_by_receiver_name(receiver.name,null,function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });

    it("should find jobs by receiver name from db", function(done){
      var jb2 = new JobBoard();
      jb2.find_jobs_by_receiver_name(receiver.name,{},function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });
  });

  describe("push", function(){
    var receiver_options = {
      name: 'push_test',
      paths: [{
        name: 'pusher',
        url: '/foo'
      }]
    };
    
    var job_options = {
      receiver: 'push_test',
      path: 'pusher',
      payload: 'push=true'
    };

    beforeEach(function(done){
      jb.add_receiver(receiver_options,function(err){
        done(err);
      });
    });

    it("should add jobs to db", function(done){
      jb.push(fix.job(job_options),function(err,job){
        if(err) return done(err);
        jb.get_job(job._id,function(err,retrieved_job){
          if(err) return done(err);
          assert.equal(job.payload,retrieved_job.payload);
          done();
        });
      });
    });
  });

});