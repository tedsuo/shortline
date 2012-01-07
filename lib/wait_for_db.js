module.exports = function(adapter){
  return function(callback){
    adapter.emitter.on('open', function(){
      callback();
    });
  };
}
