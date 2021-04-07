import { __awaiter, __generator } from "tslib";
import { Message } from "./message";
import { MongoClient, ObjectId } from "mongodb";
/**
A Subscribed Connection object allows you to create a basic connection to a queue. This saves you from
having to pass the mongoDB connection information with every request, as from the static factory Quetify class
 */
var SubscribedConnection = /** @class */ (function () {
    function SubscribedConnection(server, queue) {
        this.isAutopolling = false;
        this.autopoller = null;
        this.server = server;
        this.queue = queue;
    }
    SubscribedConnection.prototype.disconnect = function () {
        this.killAutopoller();
    };
    /**
     * Create an interval that will auto-poll a queue for messages. When a message is found the
     * provided callback function will be executed with the dequeued message
     * @param duration The duration to poll, in milliseconds
     * @param callback The callback function to execute when a message is found
     */
    SubscribedConnection.prototype.autopoll = function (duration, callback) {
        if (!this.isAutopolling) {
            this.isAutopolling = true;
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            var me_1 = this;
            this.autopoller = setInterval(function () { return function () {
                return __awaiter(this, void 0, void 0, function () {
                    var message;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, me_1.dequeue()];
                            case 1:
                                message = _a.sent();
                                if (message) {
                                    callback(message);
                                }
                                return [2 /*return*/];
                        }
                    });
                });
            }; }, duration);
        }
        else {
            throw new Error('Autopolling has already been activated for this Subscribed Connection');
        }
    };
    /**
     * Destructor forthe active auto-polling interval
     */
    SubscribedConnection.prototype.killAutopoller = function () {
        if (this.autopoller) {
            clearInterval(this.autopoller);
            this.autopoller = null;
            this.isAutopolling = false;
        }
    };
    /**
     * Enqueue a message to the queue
     * @param payload The message payload to queue
     * @param priority The priority. Ignored if the queue is not a priority queue
     * @returns The enqueued items ID
     */
    SubscribedConnection.prototype.enqueue = function (payload, priority) {
        if (priority === void 0) { priority = 1; }
        return __awaiter(this, void 0, void 0, function () {
            var client, db, queueCollection, message, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        message = new Message(payload, priority);
                        return [4 /*yield*/, queueCollection.insertOne(message)];
                    case 2:
                        result = _a.sent();
                        client.close();
                        return [2 /*return*/, result.insertedId.toString()];
                }
            });
        });
    };
    /**
     * Dequeue a message from the queue. If the Queue is a Stack queue, this will be the last queued message. Queues are FIFO by default.
     * @returns The dequeued message, or null if there are none
     */
    SubscribedConnection.prototype.dequeue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, configCollection, queueConfigs, querySort, queueCollection, update, result, message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        configCollection = db.collection('quetify-config');
                        return [4 /*yield*/, configCollection.findOne({ queue: this.queue })];
                    case 2:
                        queueConfigs = _a.sent();
                        querySort = {
                            _id: queueConfigs.type && queueConfigs.type.toLowerCase() === 'stack' ? -1 : 1
                        };
                        if (queueConfigs.usePriority) {
                            querySort.priority = -1;
                        }
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.findOneAndUpdate({ status: 'queued' }, { $set: { status: "dequeued", dequeueTime: new Date().getTime() } }, { upsert: false, sort: querySort })];
                    case 3:
                        update = _a.sent();
                        if (!(update.ok && update.ok === 1)) return [3 /*break*/, 5];
                        return [4 /*yield*/, queueCollection.findOne({ _id: update.value._id })];
                    case 4:
                        result = _a.sent();
                        message = new Message(result.payload, result.priority, result.enqueueTime, result._id, result.status, new Date().getTime(), 0, result.errorTime, result.retries);
                        client.close();
                        return [2 /*return*/, message];
                    case 5:
                        client.close();
                        return [2 /*return*/, null];
                }
            });
        });
    };
    /**
   * Awknowledge a message, finalizing its process
   * @param message the message to finalize
   * @returns true if awknowledge was successful
   */
    SubscribedConnection.prototype.awknowledge = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, queueCollection, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!message._id) return [3 /*break*/, 3];
                        return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.findOneAndUpdate({ _id: message._id }, { $set: { status: "acknowledged", acknowledgedTime: new Date().getTime() } })];
                    case 2:
                        result = _a.sent();
                        client.close();
                        return [2 /*return*/, result.ok ? result.ok === 1 : false];
                    case 3: return [2 /*return*/, false];
                }
            });
        });
    };
    /**
   * Flag a message as failed/error
   * @param message the message to error
   * @returns true if error was successful
   */
    SubscribedConnection.prototype.error = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, configCollection, queueConfigs, result, queueCollection, peek;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!message._id) return [3 /*break*/, 8];
                        return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        configCollection = db.collection('quetify-config');
                        return [4 /*yield*/, configCollection.findOne({ queue: this.queue })];
                    case 2:
                        queueConfigs = _a.sent();
                        result = null;
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.findOne(new ObjectId(message._id))];
                    case 3:
                        peek = _a.sent();
                        if (!(peek.retries <= queueConfigs.retryLimit)) return [3 /*break*/, 5];
                        return [4 /*yield*/, queueCollection.findOneAndUpdate({ _id: message._id }, { $set: { status: 'queued', enqueueTime: new Date().getTime(), errorTime: new Date().getTime(), retries: peek.retries + 1 } })];
                    case 4:
                        result = _a.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, queueCollection.findOneAndUpdate({ _id: message._id }, { $set: { status: 'error', errorTime: new Date().getTime() } })];
                    case 6:
                        result = _a.sent();
                        _a.label = 7;
                    case 7:
                        client.close();
                        return [2 /*return*/, result && result.ok ? result.ok === 1 : false];
                    case 8: return [2 /*return*/, false];
                }
            });
        });
    };
    /**
     * Peek allows you to return an array of queued messages, or, optionally, return a specific message by ID
     * @param messageId Optional, the ID of the message to peek at
     * @returns Array<Message> or Message, Null on error
     */
    SubscribedConnection.prototype.peek = function (messageId) {
        if (messageId === void 0) { messageId = null; }
        return __awaiter(this, void 0, void 0, function () {
            var client, result, db, queueCollection, peekResult, _i, peekResult_1, peek, peek, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        client = null;
                        result = null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, 8, 9]);
                        return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 2:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        if (!!messageId) return [3 /*break*/, 4];
                        return [4 /*yield*/, queueCollection.find({ status: 'queued' }).toArray()];
                    case 3:
                        peekResult = _a.sent();
                        result = [];
                        for (_i = 0, peekResult_1 = peekResult; _i < peekResult_1.length; _i++) {
                            peek = peekResult_1[_i];
                            result.push(new Message(peek.payload, peek.priority, peek.enqueueTime, peek._id, peek.status, peek.dequeueTime, peek.acknowledgedTime, peek.errorTime, peek.retries));
                        }
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, queueCollection.findOne(new ObjectId(messageId))];
                    case 5:
                        peek = _a.sent();
                        result = new Message(peek.payload, peek.priority, peek.enqueueTime, peek._id, peek.status, peek.dequeueTime, peek.acknowledgedTime, peek.errorTime, peek.retries);
                        _a.label = 6;
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        err_1 = _a.sent();
                        console.error("Failed to peek at items: " + err_1);
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
     * Get the count of queued messages
     * @returns count of queued messages
     */
    SubscribedConnection.prototype.countQueued = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, queueCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.countDocuments({ status: 'queued' })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Get the count of dequeued messages
     * @returns count of dequeued messages
     */
    SubscribedConnection.prototype.countDequeued = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, queueCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.countDocuments({ status: 'dequeued' })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Get the count of acknowledged messages
     * @returns count of acknowledged messages
     */
    SubscribedConnection.prototype.countAcknowledged = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, queueCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.countDocuments({ status: 'acknowledged' })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Get the count of failed messages
     * @returns count of failed messages
     */
    SubscribedConnection.prototype.countErrors = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, db, queueCollection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, MongoClient.connect(this.server, { useNewUrlParser: true, useUnifiedTopology: true })];
                    case 1:
                        client = _a.sent();
                        db = client.db('quetify-db');
                        queueCollection = db.collection(this.queue);
                        return [4 /*yield*/, queueCollection.countDocuments({ status: 'error' })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return SubscribedConnection;
}());
export { SubscribedConnection };
//# sourceMappingURL=subscribedConnection.js.map