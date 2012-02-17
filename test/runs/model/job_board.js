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
          assert.equal(receiver[key],queue.receiver[key]);
        });
        done();
      });
    });

    it('new receiver should be loaded',function(){
      assert.deepEqual(jb.queues[queue.name], queue);
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

});
