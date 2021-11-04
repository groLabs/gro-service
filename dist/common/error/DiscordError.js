"use strict";
class DiscordError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscordError';
    }
}
module.exports = {
    DiscordError,
};
