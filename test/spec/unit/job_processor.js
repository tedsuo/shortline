var ROOT = require('../../test_config').ROOT;
var JobProcessor = require(ROOT+'lib/model/job_processor');
var db = require(ROOT+'lib/db/adapter');
var assert = require('assert');
var async = require('async');
var fix = require(ROOT+'test/fixtures');

describe('JobProcessor',function(){

  beforeEach(function(done){
    db.remove_all(function(err){
      if(err) return done(err);
      done();
    });
  });

  describe('create', function(){
    it('should work with acceptable defaults',function(done){
      var jp = new JobProcessor({
        name: 'foo', 
        host:'foo.com'
      });
      assert.equal(jp.name, 'foo');
      assert.equal(jp.host, 'foo.com');
      assert.equal(jp.port, 80);
      assert.equal(jp.concurrency, 5);
      assert.equal(jp.max_queue, 50);
      assert.equal(jp.refill_size, 25);
      done();
    });

    it('should work with all options being set',function(done){
      var paths = [
        { name:'worker1', path:'/worker1'},
        { name:'worker2', path:'/worker2'}
      ]
      var jp = new JobProcessor({
        name: 'foo', 
        host:'foo.com',
        port: 8080,
        ip:'127.0.0.1',
        concurrency: 10,
        paths: paths
      });
      assert.equal(jp.name, 'foo');
      assert.equal(jp.host, 'foo.com');
      assert.equal(jp.port, 8080);
      //assert.equal(jp.paths, paths);
      assert.equal(jp.concurrency, 10);
      assert.equal(jp.max_queue, 100);
      assert.equal(jp.refill_size, 50);
      done();
    });
  });

});