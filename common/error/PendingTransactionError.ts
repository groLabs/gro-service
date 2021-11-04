export default class PendingTransactionError extends Error {
    messageTag: any;
    embedMessage: any;
    constructor(message: string | undefined, messageTag: any, embedMessage: any) {
        super(message);
        this.name = 'PendingTransactionError';
        this.messageTag = messageTag;
        this.embedMessage = embedMessage;
    }
}
