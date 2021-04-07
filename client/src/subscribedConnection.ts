import { Message } from "./message"
import { FindAndModifyWriteOpResultObject, MongoClient, ObjectId } from "mongodb"

/**
A Subscribed Connection object allows you to create a basic connection to a queue. This saves you from
having to pass the mongoDB connection information with every request, as from the static factory Quetify class
 */
export class SubscribedConnection {
  private server: string
  private queue: string
  private isAutopolling = false
  private autopoller: any = null

  constructor (server: string, queue: string) {
    this.server = server
    this.queue = queue
  }

  public disconnect (): void {
    this.killAutopoller()
  }

  /**
   * Create an interval that will auto-poll a queue for messages. When a message is found the
   * provided callback function will be executed with the dequeued message
   * @param duration The duration to poll, in milliseconds
   * @param callback The callback function to execute when a message is found
   */
  public autopoll (duration: number, callback: (message: Message|null) => any): void {
    if (!this.isAutopolling) {
      this.isAutopolling = true
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const me = this
      this.autopoller = setInterval(() => async function (): Promise<void> {
        // automatically dequeue a message. If there is one, trigger the callback with the message
        const message = await me.dequeue()
        if (message) {
          callback(message);
        }
      }, duration)
    } else {
      throw new Error('Autopolling has already been activated for this Subscribed Connection')
    }
  }

  /**
   * Destructor forthe active auto-polling interval
   */
  public killAutopoller (): void {
    if (this.autopoller) {
      clearInterval(this.autopoller)
      this.autopoller = null
      this.isAutopolling = false
    }
  }

  /**
   * Enqueue a message to the queue
   * @param payload The message payload to queue
   * @param priority The priority. Ignored if the queue is not a priority queue
   * @returns The enqueued items ID
   */
  public async enqueue (payload: any, priority = 1): Promise<string> {
    const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
    const db = client.db('quetify-db')
    const queueCollection = db.collection(this.queue)

    const message: Message = new Message(payload, priority)
    const result = await queueCollection.insertOne(message)

    client.close()

    return result.insertedId.toString()
  }

  /**
   * Dequeue a message from the queue. If the Queue is a Stack queue, this will be the last queued message. Queues are FIFO by default.
   * @returns The dequeued message, or null if there are none
   */
  public async dequeue (): Promise<Message|null> {
    const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
    const db = client.db('quetify-db')

    const configCollection = db.collection('quetify-config')
    const queueConfigs = await configCollection.findOne({ queue: this.queue })

    const querySort: any = {
      _id: queueConfigs.type && queueConfigs.type.toLowerCase() === 'stack' ? -1 : 1
    }

    if (queueConfigs.usePriority) {
      querySort.priority = -1
    }

    const queueCollection = db.collection(this.queue)

    const update: FindAndModifyWriteOpResultObject<any> = await queueCollection.findOneAndUpdate({ status: 'queued' }, { $set: { status: "dequeued", dequeueTime: new Date().getTime() } }, { upsert: false, sort: querySort });

    if (update.ok && update.ok === 1) {
      const result = await queueCollection.findOne({ _id: update.value._id})
      const message: Message = new Message(result.payload, result.priority, result.enqueueTime, result._id, result.status, new Date().getTime(), 0, result.errorTime, result.retries)
      client.close()
      return message
    } else {
      client.close()
      return null
    }

  }

    /**
   * Awknowledge a message, finalizing its process
   * @param message the message to finalize
   * @returns true if awknowledge was successful
   */
  public async awknowledge (message: Message): Promise<boolean> {
    if (message._id) {
      const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
      const db = client.db('quetify-db')
      const queueCollection = db.collection(this.queue)
  
      const result: FindAndModifyWriteOpResultObject<any> = await queueCollection.findOneAndUpdate({ _id: message._id }, { $set: { status: "acknowledged", acknowledgedTime: new Date().getTime() } });
  
      client.close()
      return result.ok ? result.ok === 1 : false
    } else {
      return false;
    }
  }

    /**
   * Flag a message as failed/error
   * @param message the message to error
   * @returns true if error was successful
   */
  public async error (message: Message): Promise<boolean> {
    if (message._id) {
      const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
      const db = client.db('quetify-db')

      // if retries exceeds settings, set to error, else up the retry
      const configCollection = db.collection('quetify-config')
      const queueConfigs = await configCollection.findOne({ queue: this.queue })

      let result = null;
      const queueCollection = db.collection(this.queue)

      const peek = await queueCollection.findOne(new ObjectId(message._id))
      if (peek.retries <= queueConfigs.retryLimit) {
        result = await queueCollection.findOneAndUpdate({ _id: message._id }, { $set: { status: 'queued', enqueueTime: new Date().getTime(), errorTime: new Date().getTime(), retries: peek.retries + 1 } });
      } else {
        result = await queueCollection.findOneAndUpdate({ _id: message._id }, { $set: { status: 'error', errorTime: new Date().getTime() } });
      }
  
      client.close()
      return result && result.ok ? result.ok === 1 : false
    } else {
      return false;
    }
  }

  /**
   * Peek allows you to return an array of queued messages, or, optionally, return a specific message by ID
   * @param messageId Optional, the ID of the message to peek at
   * @returns Array<Message> or Message, Null on error
   */
  public async peek (messageId: string|null = null): Promise<Array<Message>|Message|null> {
    let client: MongoClient|null = null
    let result: Array<Message>|Message|null = null
    try {
      client = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
      const db = client.db('quetify-db')
      const queueCollection = db.collection(this.queue)

      if (!messageId) {
        const peekResult = await queueCollection.find({ status: 'queued' }).toArray()
        result = []
        for (const peek of peekResult) {
          result.push(new Message(peek.payload, peek.priority, peek.enqueueTime, peek._id, peek.status, peek.dequeueTime, peek.acknowledgedTime, peek.errorTime, peek.retries))
        }
      } else {
        const peek = await queueCollection.findOne(new ObjectId(messageId))
        result = new Message(peek.payload, peek.priority, peek.enqueueTime, peek._id, peek.status, peek.dequeueTime, peek.acknowledgedTime, peek.errorTime, peek.retries)
      }
    } catch (err) {
      console.error(`Failed to peek at items: ${err}`)
    } finally {
      if (client) {
        client.close()
      }
    }

    return result
  }

  /**
   * Get the count of queued messages
   * @returns count of queued messages
   */
  public async countQueued (): Promise<number> {
    const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
    const db = client.db('quetify-db')
    const queueCollection = db.collection(this.queue)
    return await queueCollection.countDocuments({ status: 'queued' })
  }

  /**
   * Get the count of dequeued messages
   * @returns count of dequeued messages
   */
  public async countDequeued (): Promise<number> {
    const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
    const db = client.db('quetify-db')
    const queueCollection = db.collection(this.queue)
    return await queueCollection.countDocuments({ status: 'dequeued' })
  }

  /**
   * Get the count of acknowledged messages
   * @returns count of acknowledged messages
   */
  public async countAcknowledged (): Promise<number> {
    const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
    const db = client.db('quetify-db')
    const queueCollection = db.collection(this.queue)
    return await queueCollection.countDocuments({ status: 'acknowledged' })
  }

  /**
   * Get the count of failed messages
   * @returns count of failed messages
   */
  public async countErrors (): Promise<number> {
    const client: MongoClient = await MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })
    const db = client.db('quetify-db')
    const queueCollection = db.collection(this.queue)
    return await queueCollection.countDocuments({ status: 'error' })
  }
}