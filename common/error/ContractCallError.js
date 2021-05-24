class ContractCallError extends Error {
    constructor(message, messageTag, option = {}) {
        super(message);
        this.name = 'ContractCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}

module.exports = {
    ContractCallError,
};
