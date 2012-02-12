var async = require('async');
var exec = require('child_process').exec;
var BINPATH = require('../../test_config').BINPATH;

exec(BINPATH + " stop");
