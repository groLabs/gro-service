class BlockChainCallError extends Error {
    constructor(message, messageTag, option = {}) {
        super(message);
        this.name = 'BlockChainCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}

module.exports = {
    BlockChainCallError,
};
