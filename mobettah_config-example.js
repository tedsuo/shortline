module.exports = {
  mail: {
    host: 'smtp.gmail.com',
    username: 'me@gmail.com',
    password: '**password**',
    recipient: 'example@domain.tld'
  },
  host: 'localhost',
  port: 8001,
  failed_restart_subject: 'Critical: Child process failing on restart',
  failed_restart_body: 'Child process is failing on restart.  Your attention is required to fix the problem',
  max_restarts_subject: 'Warning: Max restarts reached',
  max_restarts_body: 'Child process restarts have reached the critical threshold.  You may want to check up on the child process.',
  log_file: '/path/to/logfile'
};
