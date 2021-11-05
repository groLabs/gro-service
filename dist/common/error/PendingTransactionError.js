"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PendingTransactionError extends Error {
    constructor(message, messageTag, embedMessage) {
        super(message);
        this.name = 'PendingTransactionError';
        this.messageTag = messageTag;
        this.embedMessage = embedMessage;
    }
}
exports.default = PendingTransactionError;
