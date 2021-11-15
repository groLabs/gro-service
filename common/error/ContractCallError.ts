import { Option } from './types'

export default class ContractCallError extends Error {
    messageTag: any;
    transactionHash: string | undefined;
    embedMessage: string | undefined;
    constructor(message: string | undefined, messageTag?: any, option: Option = {} as Option) {
        super(message);
        this.name = 'ContractCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}
