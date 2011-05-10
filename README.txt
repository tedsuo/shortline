# JOB PROCESSOR

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