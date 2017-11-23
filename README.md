# SQS Write Stream
Create a writable stream to send your SQS messages.

## Installation
`npm i -S sqs-write-stream`

## Requirements
Requires Node 8.0 or greater

## Usage
First argument is an object that must have either a name or url for the queue

## Additional Stream Events
```
const SqsWriteStream = require('sqs-write-stream');
const rs = new  SqsWriteStream({ url: 'http://blabla.com' }, options);

rs.on('streamConstructed',
    (queue, options) => console.info(queue, options));

rs.on('msgReceived', msg => console.info(msg));

rs.on('msgProcessed', msg => console.info(msg));

rs.on('msgProcessingErr', console.error(obj, err));

rs.on('streamFinishingErr', err => console.error(err));
