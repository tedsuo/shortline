module.exports = {
  default_receiver_timeout: 60000,
  default_receiver_port: 80,
  default_receiver_concurrency: 5,
  trusted_ips: [
    '127.0.0.1'
  ],
  port: 8009,
  db: {
    test: {
      adapter: "mongo", 
      database: "jobboard_test",
      hosts: [ 
        {
          "host": "localhost"
        }
      ]
    },
    development: {
      adapter: "mongo",
      database: "jobboard_development",
      hosts: [
        {
          host: "localhost"
        }
      ]
    }
  }
};
