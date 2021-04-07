import { Message } from "@/message"
import { Quetify } from "../src/quetify"

describe('quetify.ts', () => {
  it('Test Querify end-to-end', async () => {
    // assumes DB is up and running

    // create a default queue
    const queueCreated = await Quetify.createQueue('mongodb://localhost:27017', 'test')
    expect(queueCreated).toBeTruthy()

    // subscribe to it
    const subscriber = Quetify.subscribe('mongodb://localhost:27017', 'test')
    // enqueue some documents
    const result = await subscriber.enqueue({ test: 'document' })
    const result2 = await subscriber.enqueue({ test: 'document2' })
    const result3 = await Quetify.enqueue('mongodb://localhost:27017', 'test', { test: 'document3' })
    expect(result).toBeTruthy()
    expect(result2).toBeTruthy()
    expect(result3).toBeTruthy()
    const messageCount = await subscriber.countQueued()
    expect(messageCount).toBe(3)
    // peek
    const peeked = await subscriber.peek() as Message[]
    expect(peeked).toBeTruthy()
    expect(peeked.length).toBe(3)
    const peekedMessage = await subscriber.peek(result) as Message
    expect(peekedMessage).toBeTruthy()
    expect(peekedMessage._id?.toString()).toEqual(result)
    // dequeue those messages
    const message = await subscriber.dequeue()
    const message2 = await subscriber.dequeue()
    const message3 = await Quetify.dequeue('mongodb://localhost:27017', 'test')
    const dequeueCount = await subscriber.countDequeued()
    expect(dequeueCount).toBe(3)
    expect(message).toBeTruthy()
    expect(message2).toBeTruthy()
    expect(message3).toBeTruthy()
    // awknowledge the messages to finialize them
    if (message && message2 && message3) {
      expect(message.payload.test).toEqual('document')
      expect(message.status).toEqual('dequeued')
      const awk = await subscriber.awknowledge(message)
      expect(awk).toBeTruthy()

      expect(message2.payload.test).toEqual('document2')
      expect(message2.status).toEqual('dequeued')
      const awk2 = await Quetify.awknowledge('mongodb://localhost:27017', 'test', message2)
      expect(awk2).toBeTruthy()

      expect(message3.payload.test).toEqual('document3')
      expect(message3.status).toEqual('dequeued')
      const err = await subscriber.error(message3)
      expect(err).toBeTruthy()

      const awkCount = await subscriber.countAcknowledged()
      expect(awkCount).toBe(2)

      const errCount = await subscriber.countErrors()
      expect(errCount).toBe(0)
    }

    await Quetify.enqueue('mongodb://localhost:27017', 'test', { another: 'test' })
    const staticQueueMessage = await Quetify.dequeue('mongodb://localhost:27017', 'test')
    if (staticQueueMessage) {
      await Quetify.awknowledge('mongodb://localhost:27017', 'test', staticQueueMessage)
      await Quetify.error('mongodb://localhost:27017', 'test', staticQueueMessage)
    }

    // flush the queue
    const flushResult = await Quetify.flushQueue('mongodb://localhost:27017', 'test')
    expect(flushResult).toBeTruthy()

    // delete the queue
    const deleteResult = await Quetify.deleteQueue('mongodb://localhost:27017', 'test')
    expect(deleteResult).toBeTruthy()
  })
})
