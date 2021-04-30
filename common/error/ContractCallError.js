class ContractCallError extends Error {
    constructor(message, messageTag, transactionHash) {
        super(message);
        this.name = 'ContractCallError';
        this.messageTag = messageTag;
        this.transactionHash = transactionHash;
    }
}

module.exports = {
    ContractCallError,
};
