var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var exec = require('child_process').exec;
var express = require('express');
var http = require('http');
var BINPATH = require('../../test_config').BINPATH;
var ROOT = require('../../test_config').ROOT;
var config = require(ROOT+'lib/config');
var Jamboree = require(ROOT+'lib/model/jamboree');

var endpoint;

describe('Load', function(){

  before(function(done){
    endpoint = express.createServer();
    endpoint.listen(8010);
    var jb = new Jamboree();
    jb.remove_all(function(err){
      if(err) return done(err);
      exec(BINPATH + " start -m test", function(err){
        if(err) return done(err);
        exec(BINPATH + ' add receiver testoverflow localhost -p 8010 -c 5 -m test', done);
      });
    });
  });

  after(function(done){
    endpoint.close();
    var jb = new Jamboree();
    jb.remove_all(function(err){
      if(err) return done(err);
      exec(BINPATH + " stop -m test", done);
    });
  });

  it("Server retreives and completes overflow jobs from db",function(next){
    var total_requests = 800;

    endpoint.post(
      '/some/overflow', 
      buffer_request,
      create_response_handler(total_requests,next)
    );

    exec(BINPATH + ' add path testoverflow someoverflow some/overflow -m test', function(){
      load_test('/testoverflow/someoverflow',total_requests);
    });
  });

});

var generic_request_options = {
  host: 'localhost',
  port: config.port,
  method: 'POST'
};

function load_test(path,total_requests){
  var x = 0;
  var make_request = function(){
    var options = _.extend({path: path}, generic_request_options);
    var req = http.request(options, function(){});
    req.end(x.toString());
    ++x;
    if(x < total_requests){
      process.nextTick(make_request);
    }
  };
  make_request();
}

function buffer_request(req,res,next){
  req.body = "";
  req.on('data', function(chunk){
    req.body += chunk;
  });
  req.on('end',next);
}

function create_response_handler(total_requests,next){
  var endpoint_reached_count = 0;
  var concurrent_requests = 0;
  var job_requests_map = [];

  return function(req, res){
    var last_request;

    ++endpoint_reached_count;
    if(endpoint_reached_count === total_requests){
      last_request = true;
    }

    ++concurrent_requests;
    if(concurrent_requests > 5){
  //          return next(new Error('too many concurrent requests'));
    }

    if(job_requests_map[Number(req.body)]){
      job_requests_map[Number(req.body)]++;
    } else {
      job_requests_map[Number(req.body)] = 1;
    }
    setTimeout(function(){
      --concurrent_requests;
      res.end('got it');
      if(last_request){
        setTimeout(function(){
          assert.equal(job_requests_map.length,total_requests);
          _.each(job_requests_map, function(requests){
            if(requests != 1){
              assert.equal(requests,1,"Server is not completing all jobs");
            }
          });
          next();
        }, 500);
      }
    }, 100);
  };
}
