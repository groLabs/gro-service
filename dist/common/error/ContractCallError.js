"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContractCallError extends Error {
    constructor(message, messageTag, option = {}) {
        super(message);
        this.name = 'ContractCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}
exports.default = ContractCallError;
