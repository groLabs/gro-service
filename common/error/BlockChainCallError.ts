import { Option } from './types'

export default class BlockChainCallError extends Error {
    messageTag: string;
    transactionHash: string| undefined;
    embedMessage: string| undefined;
    constructor(message: string | undefined, messageTag?: string, option: Option = {} as Option) {
        super(message);
        this.name = 'BlockChainCallError';
        this.messageTag = messageTag;
        this.transactionHash = option.transactionHash;
        this.embedMessage = option.embedMessage;
    }
}
