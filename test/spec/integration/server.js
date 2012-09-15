var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var exec = require('child_process').exec;
var express = require('express');
var http = require('http');
var BINPATH = require('../../test_config').BINPATH;
var ROOT = require('../../test_config').ROOT;
var config = require(ROOT+'lib/config');
var Shortline = require(ROOT+'lib/model/shortline');

function delete_receiver_path(callback){
  exec(BINPATH + ' remove receiver testing -m test', function(){
    callback();
  });
}

var endpoint, server;

var generic_request_options = {
  host: 'localhost',
  port: config.port,
  method: 'POST'
};

describe('Server', function(){

  before(function(done){
    endpoint = express();
    server = http.createServer(endpoint).listen(8010);

    var short = new Shortline();
    short.remove_all(function(err){
      if(err) return done(err);
      exec(BINPATH + " start -m test", function(err){
        if(err) return done(err);
        done();  
      });
    });
  });

  after(function(done){
    server.close();
    var short = new Shortline();
    short.remove_all(function(err){
      if(err){
        console.log('error removing data');
        return done(err);
      }
      exec(BINPATH + " stop -m test", function(err){
        if(err){
          console.log('error stoping short');
          return done(err);
        }
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
          assert.notEqual(body.indexOf("No receiver 'false' found."), -1, "False receivers should display an error");
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
            assert.notEqual(body.indexOf('Path not found'), -1, "False paths should display an error");
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
      var req = http.request(options, function(res){
        var body = "";
        res.on('data',function(chunk){
          body += chunk;
        });
        res.on('end',function(){
          assert.notEqual(body.indexOf("Job saved. Good job!"), -1, "Valid receivers should display a confirmation.");
        });
      });
      req.end("{}");
    });
  });
});
