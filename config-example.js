// ## OPTIONS
//

var shortline_config = module.exports = {

// ###  default\_receiver\_timeout  _60000_
// maximum amount of time shortline will wait before closing the connection
// and recording that the request failed due to timeout
//
  default_receiver_timeout: 60000,

// ### default\_receiver\_port  _80_
// port to connect to on each endpoint
// 
  default_receiver_port: 80,

// ### default\_receiver\_concurrency  _5_
// maximun number of connections to each endpoint
//
  default_receiver_concurrency: 5,

// ### trusted_ips
// whitelist of ips which can submit jobs
//
  trusted_ips: [
    '127.0.0.1'
  ],

// ### port
// port shortline should listen on for incoming requests
//
  port: 8009,

// ## DB OPTIONS
//
// shortline has seperate databases for the following modes:
// - production
// - development
// - test
//
// shortline currently supports mongoDB and MySQL 
//
// ### mysql config
// - **adapter** mysql
// - **host**
// - **user**
// - **password**
// - **database**
//
// ### mongo config
// - **adapter** mongo
// - **user** _optional_
// - **password** _optional_
// - **database**
// - **hosts**  
// an array of host:port pairs  
// port defaults to 27017
//

  db: {
    production: {
      adapter: "mysql",
      host: "localhost",
      user: "user",
      password: "password",
      database: "jobboard_production"
    },

    development: {
      adapter: "mongo",
      database: "jobboard_development",
      hosts: [
        {
          host: "some.tld"
        }
      ]
    },

    test: {
      adapter: "mongo",
      database: "jobboard_development",
      hosts: [
        {
          host: "some.tld"
        }
      ]
    }
  }
};
