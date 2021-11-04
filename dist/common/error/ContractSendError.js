"use strict";
class ContractSendError extends Error {
    constructor(message, messageTag, params) {
        super(message);
        this.name = 'ContractSendError';
        this.messageTag = messageTag;
        this.params = params;
    }
}
module.exports = {
    ContractSendError,
};
