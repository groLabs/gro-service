"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ParameterError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParameterError';
    }
}
exports.default = ParameterError;