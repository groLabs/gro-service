interface IParams {
    vault: string;
    strategyIndex: string;
    callCost: string;
}

export default class ContractSendError extends Error {
    messageTag: string;
    params?: IParams;
    constructor(message: string | undefined, messageTag: string, params?: IParams) {
        super(message);
        this.name = 'ContractSendError';
        this.messageTag = messageTag;
        this.params = params;
    }
}
