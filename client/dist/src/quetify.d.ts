import { Message } from './message';
import { SubscribedConnection } from './subscribedConnection';
/**
  Static factory for Quetify connections and helpers
  Queues can also be managed from this static class, though it's recommended
  to use the CLI tools when possible to prevent errors
 */
export declare class Quetify {
    /**
     * Subscribe to a Queue, for enqueue and dequeue of messages.
     * @param server The connection string for your MongoDB server
     * @returns SubscribedConnection for polling and using the Queue
     */
    static subscribe(server: string, queue: string): SubscribedConnection;
    /**
     * Queue a message
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @param payload the payload to attach to the message
     * @returns the enqueued items ID
     */
    static enqueue(server: string, queue: string, payload: any): Promise<string>;
    /**
     * Dequeue the next available message
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @returns A message if successful, or null if there are no messages available
     */
    static dequeue(server: string, queue: string): Promise<Message | null>;
    /**
     * Awknowledge a message, finalizing its process
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @param message the message to finalize
     * @returns true if awknowledge was successful
     */
    static awknowledge(server: string, queue: string, message: Message): Promise<boolean>;
    /**
     * Flag a message as failed/error
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @param message the message to error
     * @returns true if error was successful
     */
    static error(server: string, queue: string, message: Message): Promise<boolean>;
    /**
     * Create a Queue collection on a MongoDB server. This will also create the quetify-db database if it doesn't already exist
     * @param server the mongoDB server
     * @param queueName the name of the queue to create
     * @param retryLimit Optional param indicating the queue max retry limit on error flagging
     * @param usePriority Optional param indicating if the queue should use priority
     * @param type Param indicating the type of queue. Options are FIFO or stack
     * @returns true if the queue was successfully created
     */
    static createQueue(server: string, queueName: string, retryLimit?: number, usePriority?: boolean, type?: string): Promise<boolean>;
    /**
     * Deletes a queue and destroys all queued messages. WARNING, this cannot be undone
     * @param server the mongoDB server containing the queue database and collection
     * @param queueName the name of the queue to delete
     * @returns true if the queue was successfully deleted
     */
    static deleteQueue(server: string, queueName: string): Promise<boolean>;
    /**
     * Flush messages from a queue. Normally, no message is ever removed from the queue, only the status changes. You
     * can use this to completely empty a queue, or just flush out acknowledged records
     * @param server the mongoDB server containing the queue
     * @param queueName the name of the queue to flush
     * @param keepQueuedRecords optional param, if true only acknowledged records will be flushed, false will empty the queue entirely
     * @returns true if the flush was successful
     */
    static flushQueue(server: string, queueName: string, keepQueuedRecords?: boolean): Promise<boolean>;
}
