export interface IDiscordUrl {
    type?: string;
    value?: string;
    label?: string;
}

export interface IDiscordMessage {
    message?: string;
    type?: string;
    description?: string;
    urls?: IDiscordUrl[];
    timestamp?: Date;
    result?: string;
    params?: string;
    transactionHash?: string;
    emojis?: string[]
    icon?: string;
}
