var ROOT = require('../../test_config').ROOT;
var Shortline = require(ROOT+'lib/model/shortline');
var db = require(ROOT+'lib/db/adapter');
var assert = require('assert');
var async = require('async');
var fix = require(ROOT+'test/fixtures');
var short;


describe('Shortline',function(){

  before(function(){
    short = new Shortline();
  });

  beforeEach(function(done){
    short.remove_all(function(err){
      if(err) return done(err);
      done();
    });
  });

  describe('remove_all', function(){
    var receiver = fix.receiver();

    beforeEach(function(done){
      short.add_receiver(receiver,function(err,q){
        if(err) return done(err);
        short.remove_all(function(err){
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
          short.add_receiver(fix.receiver(),next);
        },
        function(next){
          short.add_receiver(fix.receiver(),next);
        },
        function(next){
          short.add_receiver(fix.receiver(),next);
        }
      ],function(){
        var short2 = new Shortline();
        assert.equal(short2.count_receivers(),0);
        short2.load_receivers(function(err){
          if(err) return done(err);
          assert.equal(short2.count_receivers(),3);
          done();
        });
      });
    });
  });

  describe('count_receivers', function(){
    it('should count all currently loaded receivers', function(done){
      assert.equal(short.count_receivers(),0);
      
      async.parallel([
        function(next){
          short.add_receiver(fix.receiver(),next);
        },
        function(next){
          short.add_receiver(fix.receiver(),next);
        },
        function(next){
          short.add_receiver(fix.receiver(),next);
        }
      ],function(){
        assert.equal(short.count_receivers(),3);
        done();
      });
    });
  });

  describe('get_receiver', function(){
    it("should find receiver by name", function(done){
      var fixture = fix.receiver();
      short.add_receiver(fixture, function(){
        var short2 = new Shortline();
        short2.get_receiver(fixture.name,function(err,receiver){
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
      short.add_receiver(fixture,function(err,q){
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
      assert.deepEqual(short.queues[queue.name], queue);
    });
  });

  describe('update_receiver', function(){
    var queue;
    var fixture = fix.receiver();
    var new_fixture = fix.receiver();

    beforeEach(function(done){
      short.add_receiver(fixture,function(err,q){
        if(err) return done(err);
        short.update_receiver(fixture.name,new_fixture,function(err,q){
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
      assert.equal(short.queues[new_fixture.name].name, new_fixture.name);
      assert.equal(short.queues[fixture.name],undefined)
      done();
    });
  });

  describe('remove_receiver', function(){
    var queue;
    var fixture = fix.receiver();

    beforeEach(function(done){
      short.add_receiver(fixture,function(err,q){
        if(err) return done(err);
        short.remove_receiver(fixture.name,function(err){
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

  describe('jobs', function(){
    var receiver = fix.receiver();
    var job_options, jobs, next, receiver_id;

    beforeEach(function(done){
      short.add_receiver(receiver,function(err, r){
        if(err) return done(err);
        job_options = {
          receiver_id: r.id,
          status: 'queued'
        };

        receiver_id = r.id;

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
          short.create_job(job,function(err,job){
            if(err) return next(err);
            next(null,job);
          });
        });
      });
    });

    it('should create and retrieve jobs',function(done){
      var job = short.create_job(fix.job(job_options),function(err,job){
        if(err) return done(err);
        short.get_job(job._id,function(err,retrieved_job){
          if(err) return done(err);
          assert.equal(job.payload,retrieved_job.payload);
          done();
        });        
      });
    });

    it("should find jobs by receiver id", function(done){
      short.find_jobs_by_receiver_id(receiver_id,null,function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });

    it("should find jobs by receiver id from db", function(done){
      var short2 = new Shortline();
      short2.find_jobs_by_receiver_id(receiver_id,{},function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });

    it("should find jobs by receiver name", function(done){
      short.find_jobs_by_receiver_name(receiver.name,null,function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });

    it("should find jobs by receiver name from db", function(done){
      var short2 = new Shortline();
      short2.find_jobs_by_receiver_name(receiver.name,{},function(err,result){
        if(err) return done(err);
        assert.equal(result.length,jobs.length);
        done();
      });
    });
  });

  describe("push", function(){
    var receiver_options = {
      name: 'push_test',
      host: 'localhost'
    };
    
    var job_options = {
      receiver: 'push_test',
      path: '/foo',
      payload: 'push=true'
    };

    beforeEach(function(done){
      short.add_receiver(receiver_options,function(err){
        done(err);
      });
    });

    it("should add jobs to db", function(done){
      short.push(fix.job(job_options),function(err,job){
        if(err) return done(err);
        short.get_job(job._id,function(err,retrieved_job){
          if(err) return done(err);
          assert.equal(job.payload,retrieved_job.payload);
          done();
        });
      });
    });
  });

});
