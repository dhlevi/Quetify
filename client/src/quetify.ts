import { Message } from './message'
import { SubscribedConnection } from './subscribedConnection'
import { MongoClient } from "mongodb"
/**
  Static factory for Quetify connections and helpers
  Queues can also be managed from this static class, though it's recommended
  to use the CLI tools when possible to prevent errors
 */
export class Quetify {
  /**
   * Subscribe to a Queue, for enqueue and dequeue of messages.
   * @param server The connection string for your MongoDB server
   * @returns SubscribedConnection for polling and using the Queue
   */
  public static subscribe (server: string, queue: string): SubscribedConnection {
    const subscriber = new SubscribedConnection(server, queue)
    return subscriber
  }

  /**
   * Queue a message
   * @param server the mongoDB server containing the queue
   * @param queue the name of the queue
   * @param payload the payload to attach to the message
   * @returns the enqueued items ID
   */
  public static async enqueue (server: string, queue: string, payload: any): Promise<string> {
    return await this.subscribe(server, queue).enqueue(payload)
  }

  /**
   * Dequeue the next available message
   * @param server the mongoDB server containing the queue
   * @param queue the name of the queue
   * @returns A message if successful, or null if there are no messages available
   */
  public static async dequeue (server: string, queue: string): Promise<Message|null> {
    return await this.subscribe(server, queue).dequeue()
  }

  /**
   * Awknowledge a message, finalizing its process
   * @param server the mongoDB server containing the queue
   * @param queue the name of the queue
   * @param message the message to finalize
   * @returns true if awknowledge was successful
   */
  public static async awknowledge (server: string, queue: string, message: Message): Promise<boolean> {
    return await this.subscribe(server, queue).awknowledge(message)
  }

  /**
   * Flag a message as failed/error
   * @param server the mongoDB server containing the queue
   * @param queue the name of the queue
   * @param message the message to error
   * @returns true if error was successful
   */
  public static async error (server: string, queue: string, message: Message): Promise<boolean> {
    return await this.subscribe(server, queue).error(message)
  }

  // queue management functions

  /**
   * Create a Queue collection on a MongoDB server. This will also create the quetify-db database if it doesn't already exist
   * @param server the mongoDB server
   * @param queueName the name of the queue to create
   * @param retryLimit Optional param indicating the queue max retry limit on error flagging
   * @param usePriority Optional param indicating if the queue should use priority
   * @param type Param indicating the type of queue. Options are FIFO or stack
   * @returns true if the queue was successfully created
   */
  public static async createQueue (server: string, queueName: string, retryLimit = 5, usePriority = false, type = 'fifo'): Promise<boolean> {
    // validate queue name
    if (queueName.includes('$') || queueName === '' || queueName.startsWith('system.')) {
      return false
    }

    let client: MongoClient|null = null
    let result = false
    try {
      client = await MongoClient.connect(server, { useUnifiedTopology: true });
      const db = client.db('quetify-db');
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      // check if queue/collection names exists, create queue config collection if needed
      let config = null;
      if (!collectionNames.includes('quetify-config')) {
        config = await db.createCollection('quetify-config');
      } else {
        config = db.collection('quetify-config');
      }
  
      if (!collectionNames.includes(queueName)) {
        // create queue collection
        await db.createCollection(queueName);
        // create needed indexes
        // create config doc
        const inserted = await config.insertOne({
          queue: queueName,
          retryLimit: retryLimit,
          usePriority: usePriority,
          type: type && type.toLowerCase() === 'stack' ? 'stack' : 'FIFO'
        });
      }

      result = true
    } catch (err) {
      console.error(`Failed to create queue: ${err}`)
    } finally {
      if (client) {
        client.close();
      }
    }

    return result
  }

  /**
   * Deletes a queue and destroys all queued messages. WARNING, this cannot be undone
   * @param server the mongoDB server containing the queue database and collection
   * @param queueName the name of the queue to delete
   * @returns true if the queue was successfully deleted
   */
  public static async deleteQueue (server: string, queueName: string): Promise<boolean> {
    let client: MongoClient|null = null
    let result = false
    try {
      client = await MongoClient.connect(server, { useUnifiedTopology: true });
      const db = client.db('quetify-db');
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      const config = db.collection('quetify-config');

      if (collectionNames.includes(queueName)) {
        // delete queue collection
        await db.collection(queueName).drop();
        // delete config doc
        await config.deleteOne({ queue: queueName });
      }

      result = true
    } catch (err) {
      console.error(`Failed to delete queue ${err}`)
    } finally {
      if (client) {
        client.close();
      }
    }

    return result
  }

  /**
   * Flush messages from a queue. Normally, no message is ever removed from the queue, only the status changes. You
   * can use this to completely empty a queue, or just flush out acknowledged records
   * @param server the mongoDB server containing the queue
   * @param queueName the name of the queue to flush
   * @param keepQueuedRecords optional param, if true only acknowledged records will be flushed, false will empty the queue entirely
   * @returns true if the flush was successful
   */
  public static async flushQueue (server: string, queueName: string, keepQueuedRecords = true): Promise<boolean> {
    let client: MongoClient|null = null
    let result = false
    try {
      client = await MongoClient.connect(server, { useUnifiedTopology: true });
      const db = client.db('quetify-db');
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      if (collectionNames.includes(queueName)) {
        const collection = db.collection(queueName);
        if (!keepQueuedRecords) {
          await collection.deleteMany({});
        } else {
          await collection.deleteMany({ status: 'acknowledged'});
        }
      }

      result = true
    } catch (err) {
      console.error(`Failed to flush queue: ${err}`)
    } finally {
      if (client) {
        client.close();
      }
    }

    return result
  }
}
