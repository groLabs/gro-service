export interface IDiscordUrl {
    label?: any;
    type?: string;
    value?: any;
}

export interface IDiscordMessage {
    type?: string;
    message?: string;
    description?: string;
    urls?: IDiscordUrl[]
}
