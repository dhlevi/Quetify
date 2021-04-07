import { __awaiter, __generator } from "tslib";
import { SubscribedConnection } from './subscribedConnection';
import { MongoClient } from "mongodb";
/**
  Static factory for Quetify connections and helpers
  Queues can also be managed from this static class, though it's recommended
  to use the CLI tools when possible to prevent errors
 */
var Quetify = /** @class */ (function () {
    function Quetify() {
    }
    /**
     * Subscribe to a Queue, for enqueue and dequeue of messages.
     * @param server The connection string for your MongoDB server
     * @returns SubscribedConnection for polling and using the Queue
     */
    Quetify.subscribe = function (server, queue) {
        var subscriber = new SubscribedConnection(server, queue);
        return subscriber;
    };
    /**
     * Queue a message
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @param payload the payload to attach to the message
     * @returns the enqueued items ID
     */
    Quetify.enqueue = function (server, queue, payload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.subscribe(server, queue).enqueue(payload)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Dequeue the next available message
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @returns A message if successful, or null if there are no messages available
     */
    Quetify.dequeue = function (server, queue) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.subscribe(server, queue).dequeue()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Awknowledge a message, finalizing its process
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @param message the message to finalize
     * @returns true if awknowledge was successful
     */
    Quetify.awknowledge = function (server, queue, message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.subscribe(server, queue).awknowledge(message)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Flag a message as failed/error
     * @param server the mongoDB server containing the queue
     * @param queue the name of the queue
     * @param message the message to error
     * @returns true if error was successful
     */
    Quetify.error = function (server, queue, message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.subscribe(server, queue).error(message)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
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
    Quetify.createQueue = function (server, queueName, retryLimit, usePriority, type) {
        if (retryLimit === void 0) { retryLimit = 5; }
        if (usePriority === void 0) { usePriority = false; }
        if (type === void 0) { type = 'fifo'; }
        return __awaiter(this, void 0, void 0, function () {
            var client, result, db, collections, collectionNames, config, inserted, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // validate queue name
                        if (queueName.includes('$') || queueName === '' || queueName.startsWith('system.')) {
                            return [2 /*return*/, false];
                        }
                        client = null;
                        result = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, 11, 12]);
                        return [4 /*yield*/, MongoClient.connect(server, { useUnifiedTopology: true })];
                    case 2:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        return [4 /*yield*/, db.listCollections().toArray()];
                    case 3:
                        collections = _a.sent();
                        collectionNames = collections.map(function (c) { return c.name; });
                        config = null;
                        if (!!collectionNames.includes('quetify-config')) return [3 /*break*/, 5];
                        return [4 /*yield*/, db.createCollection('quetify-config')];
                    case 4:
                        config = _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        config = db.collection('quetify-config');
                        _a.label = 6;
                    case 6:
                        if (!!collectionNames.includes(queueName)) return [3 /*break*/, 9];
                        // create queue collection
                        return [4 /*yield*/, db.createCollection(queueName)];
                    case 7:
                        // create queue collection
                        _a.sent();
                        return [4 /*yield*/, config.insertOne({
                                queue: queueName,
                                retryLimit: retryLimit,
                                usePriority: usePriority,
                                type: type && type.toLowerCase() === 'stack' ? 'stack' : 'FIFO'
                            })];
                    case 8:
                        inserted = _a.sent();
                        _a.label = 9;
                    case 9:
                        result = true;
                        return [3 /*break*/, 12];
                    case 10:
                        err_1 = _a.sent();
                        console.error("Failed to create queue: " + err_1);
                        return [3 /*break*/, 12];
                    case 11:
                        if (client) {
                            client.close();
                        }
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Deletes a queue and destroys all queued messages. WARNING, this cannot be undone
     * @param server the mongoDB server containing the queue database and collection
     * @param queueName the name of the queue to delete
     * @returns true if the queue was successfully deleted
     */
    Quetify.deleteQueue = function (server, queueName) {
        return __awaiter(this, void 0, void 0, function () {
            var client, result, db, collections, collectionNames, config, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = null;
                        result = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, 8, 9]);
                        return [4 /*yield*/, MongoClient.connect(server, { useUnifiedTopology: true })];
                    case 2:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        return [4 /*yield*/, db.listCollections().toArray()];
                    case 3:
                        collections = _a.sent();
                        collectionNames = collections.map(function (c) { return c.name; });
                        config = db.collection('quetify-config');
                        if (!collectionNames.includes(queueName)) return [3 /*break*/, 6];
                        // delete queue collection
                        return [4 /*yield*/, db.collection(queueName).drop()];
                    case 4:
                        // delete queue collection
                        _a.sent();
                        // delete config doc
                        return [4 /*yield*/, config.deleteOne({ queue: queueName })];
                    case 5:
                        // delete config doc
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        result = true;
                        return [3 /*break*/, 9];
                    case 7:
                        err_2 = _a.sent();
                        console.error("Failed to delete queue " + err_2);
                        return [3 /*break*/, 9];
                    case 8:
                        if (client) {
                            client.close();
                        }
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Flush messages from a queue. Normally, no message is ever removed from the queue, only the status changes. You
     * can use this to completely empty a queue, or just flush out acknowledged records
     * @param server the mongoDB server containing the queue
     * @param queueName the name of the queue to flush
     * @param keepQueuedRecords optional param, if true only acknowledged records will be flushed, false will empty the queue entirely
     * @returns true if the flush was successful
     */
    Quetify.flushQueue = function (server, queueName, keepQueuedRecords) {
        if (keepQueuedRecords === void 0) { keepQueuedRecords = true; }
        return __awaiter(this, void 0, void 0, function () {
            var client, result, db, collections, collectionNames, collection, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = null;
                        result = false;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, 9, 10]);
                        return [4 /*yield*/, MongoClient.connect(server, { useUnifiedTopology: true })];
                    case 2:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        return [4 /*yield*/, db.listCollections().toArray()];
                    case 3:
                        collections = _a.sent();
                        collectionNames = collections.map(function (c) { return c.name; });
                        if (!collectionNames.includes(queueName)) return [3 /*break*/, 7];
                        collection = db.collection(queueName);
                        if (!!keepQueuedRecords) return [3 /*break*/, 5];
                        return [4 /*yield*/, collection.deleteMany({})];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, collection.deleteMany({ status: 'acknowledged' })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        result = true;
                        return [3 /*break*/, 10];
                    case 8:
                        err_3 = _a.sent();
                        console.error("Failed to flush queue: " + err_3);
                        return [3 /*break*/, 10];
                    case 9:
                        if (client) {
                            client.close();
                        }
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/, result];
                }
            });
        });
    };
    return Quetify;
}());
export { Quetify };
//# sourceMappingURL=quetify.js.map