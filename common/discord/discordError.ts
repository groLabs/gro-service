export default class DiscordError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DiscordError';
    }
}
