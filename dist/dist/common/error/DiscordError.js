"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DiscordError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscordError';
    }
}
exports.default = DiscordError;
