#!/usr/bin/env node
net = require('net');
fs = require('fs');
mongodb = require('mongodb');
sys = require('sys');

net.createServer(function (stream){
  if(stream.remoteAddress == "127.0.0.1"){
  stream.addListener( 'data', function(data) {
    sys.puts(data);
  });
  } else {
    stream.end("Source Unauthorized\n");
  }
}).listen(8124);
console.log("Started listening on TCP/8124");
