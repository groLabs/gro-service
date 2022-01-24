"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const digitalUtil_1 = require("../common/digitalUtil");
const discordService_1 = require("../common/discord/discordService");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function tendMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.tend,
        message: 'Calling tend function',
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling tend function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
function updateLimitMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.updateLimit,
        message: 'Calling update limit function',
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling update limit function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
function forceCloseMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.forceClose,
        message: 'Calling force close function',
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling force close function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
function harvestMessage(content) {
    const { vaultName, vaultAddress, transactionHash, strategyName, strategyAddress, } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.harvest,
        message: `Calling strategyHarvest function to harvest ${vaultName}:${vaultAddress}'s ${strategyName}`,
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling ${vaultName}'s ${strategyName}'s harvest function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
            {
                label: vaultName,
                type: 'account',
                value: vaultAddress,
            },
            {
                label: strategyName,
                type: 'account',
                value: strategyAddress,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
module.exports = {
    tendMessage,
    updateLimitMessage,
    forceCloseMessage,
    harvestMessage,
};
