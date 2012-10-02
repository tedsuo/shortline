/*
 * Fixie the fixture genorator
 */
var _ = require('underscore');

var fixie = module.exports = function(fixtures){
  // fixture generators ready to export
  var exportables = {};
  // unique id for each fixture

  _.each(fixtures,function(fixture, name){
    exportables[name] = create_fixture_generator(fixture);
  });

  return exportables;
};

var i = 0;

var create_fixture_generator = function(fixture){
  return function(o){
    o = o || {};
    ++i;
    return _.extend(fixture(i),o);
  }
};
