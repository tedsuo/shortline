var async = require('async');
var exec = require('child_process').exec;
var BINPATH = '../bin/jb';

exec(BINPATH + " stop");
