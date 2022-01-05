import { Option } from './types'

export default class ContractCallError extends Error {
    messageTag: string;
    transactionHash: string | undefined;
    embedMessage: any;
    constructor(message: string | undefined, messageTag?: string, option: Option = {} as Option) {
        super(message);
        this.name = 'ContractCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}
