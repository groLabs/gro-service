export interface EventInfo {
    address?: string;
    blockNumber?: any;
    transactionHash?: string;
    name?: string | undefined;
    signature?: string | undefined;
    topic?: string| undefined;
    args?: any| undefined;
}

export interface IError {
    message?: string;
    messageTag?: string;
    embedMessage?: string;
    transactionHash?: string;
}
