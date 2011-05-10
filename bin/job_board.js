command = process.argv[2];

job_board = [];

commands = {
  ls:function(){
    console.log('DOMAIN : ACTIVE JOBS');
    console.log('we-r-1.org 8');
    console.log('events.ran.org 4');
    console.log('app.learn.radicaldesigns.org 0');
    job_board.forEach(function(job){
      console.log(job+' 0');
    });
  },
  add:function(){
    options = process.argv[3];
    job_board.push(options);
    console.log('added '+options);
  },
  remove:function(){},
  rewind:function(){},
  help:function(){
  	console.log('LIST OF COMMANDS');
    console.log('ls');
    console.log('update');
    console.log('remove');
    console.log('rewind');
    console.log('help');
  }
}

if(Object.keys(commands).indexOf(command) !== -1){
  commands[command]();
} else {
  commands.help();
}
