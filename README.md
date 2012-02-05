# ShortLine
    
# CONFIG  
   
## OPTIONS
    
###  default\_receiver\_timeout _60000_
maximum amount of time shortline will wait before closing the connection
and recording that the request failed due to timeout
    
### default\_receiver\_port _80_
port to connect to on each endpoint
    
### default\_receiver\_concurrency _5_
maximun number of connections to each endpoint
    
### trusted_ips
whitelist of ips which can submit jobs
    
### port
port shortline should listen on for incoming requests
    
## DB OPTIONS
shortline has seperate databases for the following modes:

- **production**
- **development**
- **test**

shortline currently supports mongoDB and MySQL 
    
### mysql config
- **adapter** mysql
- **host**
- **user**
- **password**
- **database**
    
### mongo config
- **adapter** mongo
- **user** _optional_
- **password** _optional_
- **database**
- **hosts**  
hosts an array of host:port pairs  
port defaults to 27017
    
## Components
- Receiver
- Pusher
- Queue
- Storage
- Job
- JobBoard
- CLI Interface

## Receiver
Listens for job requests.  Pushes them into the Queue and Storage.  Receivers must register their Pusher before requests will be processed.  Requests that don't have a corresponding receiver will be ignored.

## Pusher
Pulls requests off the Queue and pushes them to their processors.  Only deletes a request from the Queue after callback calls done().

## Queue
Add and remove request, can be reset from Storage given a timestamp.

## Storage
Permanent storage of requests and jobs. Requests indexed by time_created. Deleted after a month.

## Job
Manages a job lifecycle.  Registers a Receiver and a Pusher to a Queue.  Handles errors for Receiver, Pusher, and Queue.

## JobBoard
list of available Jobs, keyed by domain.  Allows for run-time configuration changes to job processing.

## CLI Interface
List, Create, Update and Delete running Jobs via the JobBoard