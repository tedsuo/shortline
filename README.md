# ShortLine

## INSTALL

Shortline is designed to be used as a service, accessed via both a command line and a REST api.

The best way to install shortline is via global npm install:

    npm install -g shortline

Once installed, use the cli to create a config file and set up your shortline service.

    short install

## CONFIG  SETTINGS
    
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
    
### db options
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

## COMMAND LINE INTERFACE

The shortline CLI is called "short" and has the following commands:

(Note: for the mode arguments, valid modes are test and production. Defaults to production.)

```
install
* Create shortline.json config file

start [-m <mode>]
* Start the shortline daemon

stop
* Stop the shortline daemon

add receiver <name> <host> [-i <ip_address>] [-c <concurrency>] [-p <port>] [-m <mode>]
* Add a receiver for the given host

update receiver <name> [-n <new_name>] [-h <host>] [-i <ip_address>] [-c <concurrency>] [-p <port>] [-m <mode>]
* Update given receiver

ls [-r <receiver_name>] [-m <mode>]
* List receivers and paths

status [-r <receiver_name>] [-m <mode>]
* List current jobs

remove receiver <name> [-m <mode>]
* Remove given receiver, and all children paths

remove all [-m <mode>]
* Remove all data from database

test
* Run the test suite 

completion
* Show the shortline bash completion script

help
* Display this dialog
```
