'use strict';

class SettingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SettingError';
    }
}

class DiscordError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscordError';
    }
}

class ContractCallError extends Error {
    constructor(message, messageTag, transactionHash) {
        super(message);
        this.name = 'ContractCallError';
        this.messageTag = messageTag;
        this.transactionHash = transactionHash;
    }
}
class ContractSendError extends Error {
    constructor(message, messageTag, params) {
        super(message);
        this.name = 'ContractSendError';
        this.messageTag = messageTag;
        this.params = params;
    }
}

class BlockChainCallError extends Error {
    constructor(message, messageTag, transactionHash) {
        super(message);
        this.name = 'BlockChainCallError';
        this.messageTag = messageTag;
        this.transactionHash = transactionHash;
    }
}

class ParameterError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParameterError';
    }
}

class PendingTransactionError extends Error {
    constructor(message, messageTag) {
        super(message);
        this.name = 'PendingTransactionError';
        this.messageTag = messageTag;
    }
}

module.exports = {
    SettingError,
    DiscordError,
    ContractCallError,
    ContractSendError,
    BlockChainCallError,
    ParameterError,
    PendingTransactionError,
};
