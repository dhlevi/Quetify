/**
 * The default message object model
 * A message is what's stored in the queue collection, and contains basic message metadata
 * as well as the payload object
 */
export declare class Message {
    _id: string | null;
    priority: number;
    payload: any;
    status: string;
    enqueueTime: number;
    dequeueTime: number;
    acknowledgedTime: number;
    errorTime: number;
    retries: number;
    constructor(payload: any, priority?: number, enqueueTime?: number, _id?: null, status?: string, dequeueTime?: number, awknowledgedTime?: number, errorTime?: number, retries?: number);
}
