class BlockChainCallError extends Error {
    constructor(message, messageTag, transactionHash) {
        super(message);
        this.name = 'BlockChainCallError';
        this.messageTag = messageTag;
        this.transactionHash = transactionHash;
    }
}

module.exports = {
    BlockChainCallError,
};
