"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SettingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SettingError';
    }
}
exports.default = SettingError;
