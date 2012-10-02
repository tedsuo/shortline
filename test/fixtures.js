var fixie = require('./lib/fixie');

var fixtures = module.exports = fixie({

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