"use strict";
class SettingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SettingError';
    }
}
module.exports = {
    SettingError,
};
