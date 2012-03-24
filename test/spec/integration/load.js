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
    before(function(done){
      var jb = new JobBoard();
      jb.remove_all(function(err){
        if(err) return done(err);
        done();  
      });
    });

    it("Server retreives and completes overflow jobs from db",function(next){
      var endpoint_reached_count = 0;
      var total_requests = 300;
      var job_requests_map = [];

      endpoint.post('/some/overflow', function(req, res){
        var last_request;
        endpoint_reached_count++;
        console.log('endpoint_reached_count',endpoint_reached_count);
        if(endpoint_reached_count == total_requests){
          last_request = true;
        }

        var body = "";
        req.on('data', function(chunk){
          body += chunk;
        });

        req.on('end', function(){
          console.log('body',body);
          if(job_requests_map[Number(body)]){
            job_requests_map[Number(body)]++;
          } else {
            job_requests_map[Number(body)] = 1;
          }
          setTimeout(function(){
            res.end('got it');
            if(last_request){
              setTimeout(function(){
                console.log(job_requests_map);
                assert.equal(job_requests_map.length,total_requests);
                _.each(job_requests_map, function(requests){
                  if(requests != 1){
                    assert.equal(requests,1,"Server is not completing all jobs");
                  }
                });
                next();
              }, 5000);
            }
          }, 4);
        });
      });

      exec(BINPATH + ' add receiver testoverflow localhost -p 8010 -c 5 -m test', function(){
        exec(BINPATH + ' add path testoverflow someoverflow some/overflow -m test', function(){
          var options = _.extend({path: '/testoverflow/someoverflow'}, generic_request_options);
          _.each(_.range(0, total_requests), function(x){
            var req = http.request(options, function(){});
            req.end(x.toString());
            req.on('err',function(err){
              next(err);
            });
          });
        });
      });
    });
  });
});