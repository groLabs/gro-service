export default class DiscordError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = 'DiscordError';
    }
}
