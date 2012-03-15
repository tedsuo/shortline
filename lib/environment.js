module.exports = function(env_str){
  env_str = env_str || process.env.NODE_ENV;
  var environment = "";
  switch(env_str){
    case "test":
      environment = "test";
      break;
    case "production":
      environment = "production";
      break;
    default:
      environment = "development";
      break;
  }
  return environment;
}
