import { Message } from "./message";
/**
A Subscribed Connection object allows you to create a basic connection to a queue. This saves you from
having to pass the mongoDB connection information with every request, as from the static factory Quetify class
 */
export declare class SubscribedConnection {
    private server;
    private queue;
    private isAutopolling;
    private autopoller;
    constructor(server: string, queue: string);
    disconnect(): void;
    /**
     * Create an interval that will auto-poll a queue for messages. When a message is found the
     * provided callback function will be executed with the dequeued message
     * @param duration The duration to poll, in milliseconds
     * @param callback The callback function to execute when a message is found
     */
    autopoll(duration: number, callback: (message: Message | null) => any): void;
    /**
     * Destructor forthe active auto-polling interval
     */
    killAutopoller(): void;
    /**
     * Enqueue a message to the queue
     * @param payload The message payload to queue
     * @param priority The priority. Ignored if the queue is not a priority queue
     * @returns The enqueued items ID
     */
    enqueue(payload: any, priority?: number): Promise<string>;
    /**
     * Dequeue a message from the queue. If the Queue is a Stack queue, this will be the last queued message. Queues are FIFO by default.
     * @returns The dequeued message, or null if there are none
     */
    dequeue(): Promise<Message | null>;
    /**
   * Awknowledge a message, finalizing its process
   * @param message the message to finalize
   * @returns true if awknowledge was successful
   */
    awknowledge(message: Message): Promise<boolean>;
    /**
   * Flag a message as failed/error
   * @param message the message to error
   * @returns true if error was successful
   */
    error(message: Message): Promise<boolean>;
    /**
     * Peek allows you to return an array of queued messages, or, optionally, return a specific message by ID
     * @param messageId Optional, the ID of the message to peek at
     * @returns Array<Message> or Message, Null on error
     */
    peek(messageId?: string | null): Promise<Array<Message> | Message | null>;
    /**
     * Get the count of queued messages
     * @returns count of queued messages
     */
    countQueued(): Promise<number>;
    /**
     * Get the count of dequeued messages
     * @returns count of dequeued messages
     */
    countDequeued(): Promise<number>;
    /**
     * Get the count of acknowledged messages
     * @returns count of acknowledged messages
     */
    countAcknowledged(): Promise<number>;
    /**
     * Get the count of failed messages
     * @returns count of failed messages
     */
    countErrors(): Promise<number>;
}
