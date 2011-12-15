module.exports = function(env_str){
  var environment = "";
  switch(env_str){
    case "test":
    case "production":
      environment = env_str;
      break;
    default:
      environment = "development";
      break;
  }
  return environment;
}
