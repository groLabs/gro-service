"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BlockChainCallError extends Error {
    constructor(message, messageTag, option = {}) {
        super(message);
        this.name = 'BlockChainCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}
exports.default = BlockChainCallError;
