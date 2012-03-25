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

function buffer_request(req,res,next){
  req.body = "";
  req.on('data', function(chunk){
    req.body += chunk;
  });
  req.on('end',next);
}

var endpoint;

var generic_request_options = {
  host: 'localhost',
  port: config.port,
  method: 'POST'
};

describe('Load', function(){

  before(function(done){
    endpoint = express.createServer();
    endpoint.listen(8010);
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
    endpoint.close();
    var jb = new JobBoard();
    jb.remove_all(function(err){
      if(err){
        console.log('error removing data');
        return done(err);
      }
      exec(BINPATH + " stop -m test", function(err){
        if(err){
          console.log('error stoping jb');
          return done(err);
        }
        done();  
      });
    });
  });

  describe('Handle Overflow',function(){

    it("Server retreives and completes overflow jobs from db",function(next){
      var endpoint_reached_count = 0;
      var total_requests = 500;
      var concurrent_requests = 0;
      var job_requests_map = [];

      endpoint.error(function(err){
        process.exit(); 
        throw err;
        next(err);
      });

      endpoint.post('/some/overflow', buffer_request, function(req, res){
        var last_request;

        ++endpoint_reached_count;
        console.log('endpoint_reached_count',endpoint_reached_count);
        if(endpoint_reached_count == total_requests){
          last_request = true;
          console.log('LAST EXPECTED REQUEST RECEIVED');
        }

        ++concurrent_requests;
        console.log('concurrent_requests',concurrent_requests);
        if(concurrent_requests > 5){
          return next(new Error('too many concurrent requests'));
        }
  

        console.log('body',req.body);
        if(job_requests_map[Number(req.body)]){
          job_requests_map[Number(req.body)]++;
        } else {
          job_requests_map[Number(req.body)] = 1;
        }
        setTimeout(function(){
          --concurrent_requests;
          res.end('got it');
          if(last_request){
            console.log('FINAL RESPONSE');
            setTimeout(function(){
              console.log(job_requests_map);
              assert.equal(job_requests_map.length,total_requests);
              _.each(job_requests_map, function(requests){
                if(requests != 1){
                  assert.equal(requests,1,"Server is not completing all jobs");
                }
              });
              next();
            }, 1000);
          }
        }, 100);
      });

      var x = 0;

      var make_request = function(){
        var options = _.extend({path: '/testoverflow/someoverflow'}, generic_request_options);
        var req = http.request(options, function(){});
        req.end(x.toString());
        ++x;
        if(x < total_requests){
          process.nextTick(make_request);
        }
      };

      exec(BINPATH + ' add receiver testoverflow localhost -p 8010 -c 5 -m test', function(){
        exec(BINPATH + ' add path testoverflow someoverflow some/overflow -m test', function(){
          make_request();
        });
      });
    });
  });
});