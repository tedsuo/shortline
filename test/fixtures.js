var _ = require('underscore');

module.exports = fixie({

  receiver: function(id){
    return {
      name: 'reciever'+id,
      host: id+'example.com' 
    } 
  },

  path: function(id){
    return {
      name: 'path'+id,
      url: '/path/to/test/'+id
    }
  },

  job: function(id){
    return {
      path     : 'foobar/'+id,
      payload : 'foo=bar'+id+'&bar=none'+id,
    } 
  }  

});


/*
 * Fixie the fixture genorator
 */
function fixie(fixtures){
  // fixture generators ready to export
  var exportables = {};
  // unique id for each fixture
  var i = 0;

  var create_fixture_generator = function(fixture){
    return function(o){
      o = o || {};
      ++i;
      return _.extend(fixture(i),o);
    }
  };

  _.each(fixtures,function(fixture, name){
    exportables[name] = create_fixture_generator(fixture);
  });

  return exportables;
}