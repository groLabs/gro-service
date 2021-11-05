"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscordClient = void 0;
const discord_js_1 = __importDefault(require("discord.js"));
const discordError_1 = __importDefault(require("./discordError"));
const configUtil_1 = require("../configUtil");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
const discordClient = new discord_js_1.default.Client();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const TOKEN = (0, configUtil_1.getConfig)('discord.token');
let isClientReady = false;
discordClient.login(TOKEN);
discordClient.on('ready', () => {
    logger.info('Discord initilize ready!');
    isClientReady = true;
});
discordClient.on('error', (err) => {
    isClientReady = false;
    logger.error(err);
});
function getDiscordClient() {
    if (isClientReady)
        return discordClient;
    const err = new discordError_1.default('Discord Service is not readly.');
    logger.error(err);
    throw err;
}
exports.getDiscordClient = getDiscordClient;
