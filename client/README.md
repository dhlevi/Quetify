# Quetify Client

The Quetify client is a nodejs package that allows you to work with Quetify queues in your application.

The client provides a simple connection object, and has the basic commands you need to enqueue and dequeue messages from a queue.

For more information about Quetify queues, see the readme at the root of this repo.

## Usage

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

To add a message to the queue, use the `enqueue` command. All you need to provide is a payload json object. Enqueue is asynchronous, and will return the ID in the promise indicating if the queuing was successful.

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

## Peeking

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