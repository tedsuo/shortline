#!/usr/bin/env node
net = require('net');
fs = require('fs');
mongodb = require('mongodb');

board = require('./lib/Board');

var server = net.createServer(function (c) {
  c.write('hello\r\n');
  c.pipe(c);
});
server.listen(8124, 'localhost');
console.log("Started listening on TCP/8124");
