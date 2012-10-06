# ShortLine

## INSTALL

Shortline is designed to be used as a service, accessed via both a command line and a REST api.

The best way to install shortline is via global npm install:
    npm install -g shortline

Once installed, use the cli to create a config file and set up your shortline service.
    short install

## CONFIG  
    
####  default\_receiver\_timeout _60000_
maximum amount of time shortline will wait before closing the connection
and recording that the request failed due to timeout
    
#### default\_receiver\_port _80_
port to connect to on each endpoint
    
#### default\_receiver\_concurrency _5_
maximun number of connections to each endpoint
    
#### trusted_ips
whitelist of ips which can submit jobs
    
#### port
port shortline should listen on for incoming requests
    
### DB OPTIONS
shortline has seperate databases for the following modes:

- **production**
- **test**

shortline currently supports mongoDB, MySQL, and Redis.
    
#### mysql
- **adapter** mysql
- **host**
- **user**
- **password**
- **database**
    
#### mongo
- **adapter** mongo
- **user** _optional_
- **password** _optional_
- **database**
- **hosts** hosts an array of host:port pairs (port defaults to 27017 if not speficied)