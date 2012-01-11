var rl = require('readline');
var spawn = require('child_process').spawn;

var i = rl.createInterface(process.stdin, process.stdout, null);

console.log('\nJob Board can be driven by either [1] MySQL or [2] MongoDB.');

i.question("Which database would you like to use? [1,2] ", function(answer) {
  console.log();

  switch(answer){
    case "1":
      install_module_exit('db-mysql');
      break;
    default:
      install_module_exit('mongoose');
      break;
  }

});

function install_module_exit(module){
  var child = spawn('npm', ['install', module], { customFds: [0,1,2] });
  child.on('exit', function(){
    i.close();
    process.stdin.destroy();
  });
}
