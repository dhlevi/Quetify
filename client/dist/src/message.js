/**
 * The default message object model
 * A message is what's stored in the queue collection, and contains basic message metadata
 * as well as the payload object
 */
var Message = /** @class */ (function () {
    function Message(payload, priority, enqueueTime, _id, status, dequeueTime, awknowledgedTime, errorTime, retries) {
        if (priority === void 0) { priority = 1; }
        if (enqueueTime === void 0) { enqueueTime = 0; }
        if (_id === void 0) { _id = null; }
        if (status === void 0) { status = 'queued'; }
        if (dequeueTime === void 0) { dequeueTime = 0; }
        if (awknowledgedTime === void 0) { awknowledgedTime = 0; }
        if (errorTime === void 0) { errorTime = 0; }
        if (retries === void 0) { retries = 0; }
        this._id = _id;
        this.priority = priority;
        this.payload = payload;
        this.status = status;
        this.dequeueTime = dequeueTime;
        this.acknowledgedTime = awknowledgedTime;
        this.errorTime = errorTime;
        this.retries = retries;
        this.enqueueTime = enqueueTime === 0 ? new Date().getTime() : enqueueTime;
    }
    return Message;
}());
export { Message };
//# sourceMappingURL=message.js.map