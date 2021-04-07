# Quetify

Quetify is a simple queue management utility for use with MongoDB and nodejs. Quetify allows you to create and configure collections for use as FIFO and stack queues, and provides a CLI and client libraries for accessing and managing them.

## How Quetify works

Quetify uses its own database on your MongoDB server, and manages queue collections independently from your main application databases. When you create a new queue, Quetify will automatically create a Database called `quetify-db`. Ensure that you don't already use that name on your server, or Quetify will inject unexpected collections at that location!

Once the database is in place, Quetify will also create a simple configuration collection called `quetify-config`. This is where queues store their configurations, and where the Quetify client will look to determine how to interact with a queue.

Each queue you create will result in a new collection being created with the given name, as well as a new configuration document stored in `quetify-config` with the provided configurations. It should go without saying, but obviously your queue name must coincide with MongoDB's collection naming structure:

Collection names should begin with an underscore or a letter character, and cannot:
- contain the $ .
- be an empty string (e.g. "" ).
- contain the null character.
- begin with the system. prefix. (Reserved for internal use.)

You can use the CLI or the Client library to create queues, however it's recommended to use the CLI for queue management to prevent errors. Creating a queue has the following configurable properties:

- `Type` The type of queue, either `FIFO` or `Stack`. Default is `FIFO`
- `Priority` A boolean value indicating that the queue should use priority for dequeuing. True or False. Default is `false`
- `Retry Limit` The retry limit when a message is flagged as an error. Marking a message as error will re-queue it until the limit is reached. Can be any positive integer, default is `5`

Once your queue is configured and created, you're ready to start using it with the client library!

### Difference between FIFO and STACK queues

A FIFO Queue, or "First In First Out" Queue, is the default and most common setting. A FIFO queue ensures that the first document added to the queue, is the first document removed from the queue. A Stack Queue works the same as the common data structure. Stacks are Last In First Out. If you're unsure what you want, you probably want a FIFO queue.

Note that Even in a FIFO or Stack queue, the priority setting can change the expected behaviour.

### Priority`

If you set a queue to use priority values, it will alter the dequeue behaviour depending on a queued messages priority. Priority values on a message are an integer from 1 (highest) to infinity, where the higher the number, the lower the priority.

For example, if you put a message on the queue with a priority of 2, and follow that with a new message of priority 1, in a FIFO queue the first message will not be dequeued in favour of the more recent, but higher priority, message.

Using priority can be risky, as a message with low priority could potentially be stuck on the queue for an extended period of time.

### Retry Limits

Retries involve the lifecycle of a queued message, and the error status. This is an optional behaviour, but if you intend to use message `Acknowledgement` and `Error` flagging, you'll want to set a retry limit to a resonable number of maximum message retries.

### Queued Message Lifecycle/Status

The basic status and lifecycle of a message in Quetify is as follows:

- Queued
- Dequeued
- Acknowledged / Error

When you queue a document, it will always be created with a status of `queued`. Only `queued` messages can be dequeued. When you call Dequeue, the message returned will be automatically changed to a `dequeued` status, meaning no other process could dequeue this message again. It's now "off the queue".

As your application finishes working with the payload of the message, it's recommended to `Acknowledge` that the message is complete by calling the acknowedge function with the client. This will flag the message as acknowledged and now it can be generally ignored. All messages remain in the collection regardless of their status unless deliberately flushed (by provided helper functions or through direct db management).

In the event your application processes a message but there is an error, you can use the `Error` function in place of `Acknowledge`. Error will check the number of retries on a message, and if it doesn't exceed the queues settings, the message will be requeued. If the retry count exceeds the queues limit, the status will change to `error`.

These `acknowedge` and `error` statuses are useful for tracking the lifecycle of a message beyond simply `queued` and `dequeued`, and are useful for auditing purposes, but there is no enforcement for using them.

### Peeking

You can peek at queued messages by using the `peek` function on the Quetify client. This will return an array of all queued messages. Optionally, if you pass in the ID of a message, it will return that message (if it still exists).

This is useful for checking existing messages. It can also be used to effectively "Cancel" existing messages by passing queued messaged to `acknowledge`. This will flag the message as acknowledged even though it hasn't been dequeued. This can be done to cancel a message, re-queue a message with an updated payload, or to re-queue a message with a new priority:

```javascript
// create a message
const messageId = await subscriber.enqueue(payload, 5)
// peek at that queued message
const message = await subscriber.peek(messageId)
// acknowledge the message, removing it from the queue
const awkResult = await subscriber.acknowledge(message)
// create a new message with the same payload, but a new priority
const newMessageId = await subscriber.enqueue(message.payload, 2)
```

Obviously, there's an element of risk in doing something like this, as your architecture might dequeue items faster than you can peek at them

## Using the Client

```javascript
import { Quetify } from "quetify"

// create a subscriber connection
const subscriber = Quetify.subscribe('mongodb://localhost:27017', 'test')

// Queue up a message
const queueResult = await subscriber.enqueue({ test: 'document' })

console.log(queueResult) // The messages ID

// Get the next available message
const message = await subscriber.dequeue()

// use an autopoller to check for queued messages
subscriber.autopoll(1000, (message) => {
  console.log(`Dequeued message ${message._id}`)
  await subscriber.acknowledge(message)
})
```

## Connecting to a queue

To connect to a queue you will need to configure properties for:
- Your MongoDB server (do not include a database, Quetify uses its own!)
- The name of the Queue you want to work with

```javascript
const subscriber = Quetify.subscribe('mongodb://localhost:27017', 'test')
```

## Queuing a document

To add a message to the queue, use the `enqueue` command. All you need to provide is a payload json object. Enqueue is asynchronous, and will return the ID of the new message in the promise indicating if the queuing was successful.

```javascript
subscriber.enqueue({ my: 'document' })
```

This will create a `Message` object on the queue. A Message object contains your payload, as well as some metadata about the request.

## Dequeuing a document

To fetch the next queued message, call `dequeue`.

```javascript
subscriber.dequeue()
```

This will return the Message object from the queue. The message you receive depends primarily on the type of queue you're using, FIFO or Stack.

To get the payload out of the message, just call the `payload` attribute

```javascript
const message = await subscriber.dequeue()
console.log(message.payload)
```

### The Message model

```javascript
{
  _id: string | null       // The ID from MongoDB
  priority: number         // The priority of the message, for priority queue usage
  payload: any             // The message payload
  status: string           // The current status, usually you'll see 'dequeued'
  enqueueTime: number      // Enqueue timestamp, in milliseconds
  dequeueTime: number      // Dequeue timestamp, in milliseconds
  acknowledgedTime: number // Acknowledged timestamp, in milliseconds
  errorTime: number        // Error timestamp, in milliseconds
  retries: number          // The number of times this message has errored and been retried
}
```

Message timestamp metadata uses milliseconds, so it works easily with dates in Java and Javascript. Making changes to the message

## Acknowledging or Failing a message

Once a message is dequeued, it can no longer be dequeued again. It's effectively "off" the queue, even though the message does still exist in the queue collection. However, your message still isn't complete until it is acknowledged in some way, either as a successful process, or an error. You do this in one of two ways:

Successful processing:

```javascript
const message = await subscriber.dequeue()
// do some useful work
const result = await subscriber.acknowledge(message)
```

This will flag a message as successfully completed and no further action needs to be taken. If you encounter an error during processing though, don't re-queue it, error it:

```javascript
const message = await subscriber.dequeue()
// do some not so useful work that fails
const result = await subscriber.error(message)
```

Flagging a message as an error will force a check on the queues retry limits. If the message has not been retried beyond this threshold, it will be re-queued automatically. If it has been retried beyond the allowable number of times by the queue, the status will be updated to Error and it will not be re-queued again.

Neither `Acknowledge` or `Error` are required, however it helps with queue management and monitoring failure conditions. Further, if you use Clear command, messages in the `dequeued` status will not be cleared, as it only removes `acknowedged` messages.

## Using the CLI

The Quetify CLI is a command line utility to assist with the management of Quetify Queues. For more information on Quetify and how it works, read the readme at the root of this repo.

You can use the same basic commands via the Quetify client as well, but it's recommended to manage your queues via the CLI to prevent errors.

Remember to include any required authentication on your mongodb server string, and do not include a DB name as quetify manages its own DB for queues and configurations. You'll have to make sure the authentication supplied has permissions to create a DB or collection on your server!

## Commands

The CLI has five main commmands

- Create
- Delete
- Clear
- Flush
- Monitor

And three parameters, some being optional depending on the command you're using

- `-s, -server` Your mongodb server. Do not include a Database name
- `-q, -queuename` The name of the queue, required for create, delete, clear, flush
- `-t, -type` Optional on create. The type of queue, either `FIFO` or `Stack`. Default is `FIFO`
- `-p, -priority` Option on create. A boolean value indicating that the queue should use priority for dequeuing. True or False. Default is `false`
- `-r, -retrylimit` Option on create. The retry limit when a message is flagged as an error. Marking a message as error will re-queue it until the limit is reached. Can be any positive integer, default is `5`

### create

Usage:

```bash
quetify create -q my-queue -s mongodb://localhost:27017/ -t FIFO -r 10 -p true
```

This will create a new Queue. If you have not created a queue before, this will also create the Quetify database and config collection. Quetify handles queues and configurations in its own database, to keep your primary collections and databases clean.

The Quetify database is called `quetify-db`. A default collection is created called `quetify-config`, which contains the configurations for queues.

### delete

Usage:

```bash
quetify delete -q my-queue -s mongodb://localhost:27017/
```

This will delete an existing queue. If the queue name doesn't exist, nothing will happen. If a queue name does exist, it will be immediately and concisely destroyed, without prejudice, feeling, or ceremony. This obviously cannot be undone, so use with caution.

### flush

Usage:

```bash
quetify flush -q my-queue -s mongodb://localhost:27017/
```

This will empty the contents of a queue. Flush will destroy all documents in a queue, including queued, dequeued, acknowledged, and error documents. This cannot be undone, so use with caution.

It's a mongodb collection under the hood, of course, so feel free to manage your data in whatever way makes sense for you.

### clear

Usage:

```bash
quetify clear -q my-queue -s mongodb://localhost:27017/
```

This will empty the acknowledged contents of a queue, and leave queued, dequeued and error documents untouched. Useful for removing documents that may no longer provide any value.

It's a mongodb colleciton under the hood, of course, so feel free to manage your data in whatever way makes sense for you.

### monitor

Usage:

```bash
quetify monitor -q my-queue -s mongodb://localhost:27017/
```

This will open up a small monitoring sparkline for your queue. If you leave out a queue name, it will monitor all queues in the Quetify database.

The monitor will show the number of requests per second for enqueued, acknowledged, and error messages.
