export default class DiscordError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscordError';
    }
}
