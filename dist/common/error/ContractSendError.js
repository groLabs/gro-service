"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContractSendError extends Error {
    constructor(message, messageTag, params) {
        super(message);
        this.name = 'ContractSendError';
        this.messageTag = messageTag;
        this.params = params;
    }
}
exports.default = ContractSendError;
