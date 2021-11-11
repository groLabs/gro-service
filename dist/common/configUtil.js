"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const config_1 = __importDefault(require("config"));
const error_1 = require("./error");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function getConfig(key, existCheck = true) {
    if (config_1.default.has(key))
        return config_1.default.get(key);
    if (existCheck) {
        const err = new error_1.SettingError(`Config: ${key} not set.`);
        logger.error(err);
        throw err;
    }
    return undefined;
}
exports.getConfig = getConfig;
