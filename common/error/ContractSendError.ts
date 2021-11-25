export default class ContractSendError extends Error {
    messageTag: any;
    params?: any;
    constructor(message: string | undefined, messageTag: any, params?: any) {
        super(message);
        this.name = 'ContractSendError';
        this.messageTag = messageTag;
        this.params = params;
    }
}
