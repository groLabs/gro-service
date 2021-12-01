export default class PendingTransactionError extends Error {
    messageTag: string;
    embedMessage?: string;
    constructor(message: string | undefined, messageTag: string, embedMessage?: string) {
        super(message);
        this.name = 'PendingTransactionError';
        this.messageTag = messageTag;
        this.embedMessage = embedMessage;
    }
}
