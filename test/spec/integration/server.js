var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var exec = require('child_process').exec;
var express = require('express');
var http = require('http');
var BINPATH = require('../../test_config').BINPATH;
var ROOT = require('../../test_config').ROOT;
var config = require(ROOT+'lib/config');
var JobBoard = require(ROOT+'lib/model/job_board');

function delete_receiver_path(callback){
  exec(BINPATH + ' remove receiver testing -m test', function(){
    callback();
  });
}

var endpoint = express.createServer();
endpoint.listen(8010);

var generic_request_options = {
  host: 'localhost',
  port: config.port,
  method: 'POST'
};

describe('Server', function(){

  before(function(done){
    var jb = new JobBoard();
    jb.remove_all(function(err){
      if(err) return done(err);
      exec(BINPATH + " start -m test", function(err){
        if(err) return done(err);
        done();  
      });
    });
  });

  after(function(done){
    var jb = new JobBoard();
    jb.remove_all(function(err){
      if(err) return done(err);
      exec(BINPATH + " stop -m test", function(err){
        if(err) return done(err);
        done();  
      });
    });
  });

  describe('False Routes', function(){
    it("should return error message for false receiver",function(next){
      var options = _.extend({path: '/false/somepath'}, generic_request_options);
      var body = "";
      var req = http.request(options, function(res){
        res.on('data',function(chunk){
          body += chunk;
        });
        res.on('end',function(){
          assert.notEqual(body.indexOf("No receiver by that name found."), -1, "False receivers should display an error");
          next();
        });
      });
      req.write("{}");
      req.end();
    });
    it("Server displays error for false path",function(next){
      exec(BINPATH + " add receiver somerecv test.com -m test", function(err, stdout){
        var options = _.extend({path: '/somerecv/blah'}, generic_request_options);
        var body = "";
        var req = http.request(options, function(res){
          res.on('data',function(chunk){
            body += chunk;
          });
          res.on('end',function(){
            assert.notEqual(body.indexOf("No path by that name found."), -1, "False paths should display an error");
            exec(BINPATH + " remove receiver somerecv -m test", function(err, stdout){
              if(err) return next(err);
              next();
            });
          });
        });
        req.write("{}");
        req.end();
      });
    });
  });

  describe('Valid Response',function(){
    it("shound respond to valid receiver and path",function(next){
      exec(BINPATH + ' add receiver testing localhost -p 8010 -m test', function(err, stderr){
        exec(BINPATH + ' add path testing somepath some/path -m test', function(err, stderr){
          var options = _.extend({path: '/testing/somepath'}, generic_request_options);
          var body = "";
          var req = http.request(options, function(res){
            res.on('data',function(chunk){
              body += chunk;
            });
            res.on('end',function(){
              assert.notEqual(body.indexOf("Job saved. Good job!"), -1, "Valid receivers should display a confirmation.");
              exec(BINPATH + ' remove receiver testing -m test', function(err, stderr){
                next();
              });
            });
          });
          req.write("{}");
          req.end();
        });
      });
    });
  });



  describe('Reach Endpoint',function(){

    before(function(next){
      exec(BINPATH + ' add receiver testing localhost -p 8010 -m test', function(){
        exec(BINPATH + ' add path testing somepath some/path -m test', function(){
          next();
        });
      });
    });

    it("should reach a valid endpoint",function(next){
      // test will timeout if we do not reach endpoint
      endpoint.post('/some/path', function(req, res){
        next();
      });
      var options = _.extend({path: '/testing/somepath'}, generic_request_options);
      var body = "";
      var req = http.request(options, function(res){
        res.on('data',function(chunk){
          body += chunk;
        });
        res.on('end',function(){
          assert.notEqual(body.indexOf("Job saved. Good job!"), -1, "Valid receivers should display a confirmation.");
        });
      });
      req.write("{}");
      req.end();
    });
  });




  describe('Handle Overflow',function(){
    before(function(done){
      var jb = new JobBoard();
      jb.remove_all(function(err){
        if(err) return done(err);
        done();  
      });
    });

    it("Server retreives and completes overflow jobs from db",function(next){
      var endpoint_reached_count = 0;
      var total_requests = 200;

      endpoint.post('/some/overflow', function(req, res){
        endpoint_reached_count++;
        if(endpoint_reached_count == total_requests){
          next();
        }
        setTimeout(function(){
          res.end('got it');
        }, 50);
      });

      exec(BINPATH + ' add receiver testoverflow localhost -p 8010 -c 5 -m test', function(){
        exec(BINPATH + ' add path testoverflow someoverflow some/overflow -m test', function(){
          var options = _.extend({path: '/testoverflow/someoverflow'}, generic_request_options);
          for(var x = 0; x < total_requests; x++){
            var req = http.request(options, function(){});
            req.write("{}");
            req.end();
          }
        });
      });
    });
  });
});
