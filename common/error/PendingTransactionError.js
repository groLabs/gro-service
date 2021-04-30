class PendingTransactionError extends Error {
    constructor(message, messageTag) {
        super(message);
        this.name = 'PendingTransactionError';
        this.messageTag = messageTag;
    }
}

module.exports = {
    PendingTransactionError,
};
