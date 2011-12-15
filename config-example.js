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
      "adapter": "mongo", // mongo or mysql
      "user": "user", //optional
      "password": "password", //optional
      "database": "jobboard_test",
      "hosts": [ // one or more if sharded...
        {
          "hostname": "localhost",
          "port": 27017, // optional
        },
        {
          "hostname": "arbitrary.tld"
        }
      ]
    },
    production: {
      "adapter": "mysql",
      "hostname": "localhost",
      "user": "user",
      "password": "password",
      "database": "jobboard_production"
    },
    development: {
      "adapter": "mongo",
      "hostname": "some.tld",
      "database": "jobboard_development",
      "hosts": [
        {
          "hostname": "some.tld"
        }
      ]
    }
  }
};
