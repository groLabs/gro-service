"use strict";
class PendingTransactionError extends Error {
    constructor(message, messageTag, embedMessage) {
        super(message);
        this.name = 'PendingTransactionError';
        this.messageTag = messageTag;
        this.embedMessage = embedMessage;
    }
}
module.exports = {
    PendingTransactionError,
};
