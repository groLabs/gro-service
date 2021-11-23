"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safetyCheckMessage = exports.updatePriceTransactionMessage = exports.updateChainlinkPriceMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const configUtil_1 = require("../common/configUtil");
const digitalUtil_1 = require("../common/digitalUtil");
const alertMessageSender_1 = require("../common/alertMessageSender");
const stableCoinNames = (0, configUtil_1.getConfig)('stable_coin', false) || [
    'DAI',
    'USDC',
    'USDT',
];
function updateChainlinkPriceMessage(content) {
    const { stableCoinAddress, stableCoinIndex } = content;
    const stableCoinName = stableCoinNames[stableCoinIndex];
    const discordMessage = {
        message: `Update chainlink price for ${stableCoinName}: ${stableCoinAddress}`,
        type: discordService_1.MESSAGE_TYPES.chainPrice,
        description: `${discordService_1.MESSAGE_EMOJI.company} Update chainlink price for ${stableCoinName}`,
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.critActionEvents, discordMessage);
}
exports.updateChainlinkPriceMessage = updateChainlinkPriceMessage;
function updatePriceTransactionMessage(content) {
    if (content.length === 0)
        return;
    const { type, msgLabel, hash, transactionReceipt } = content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = (0, digitalUtil_1.shortAccount)(hash);
    const discordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain`,
        description: `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain`,
        urls: [
            {
                label,
                type: 'tx',
                value: hash,
            },
        ],
    };
    if (!transactionReceipt) {
        discordMessage.message = `${type} transaction: ${hash} is still pending.`;
        discordMessage.description = undefined;
    }
    else if (!transactionReceipt.status) {
        discordMessage.message = `${type} transaction ${hash} reverted.`;
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action is reverted`;
    }
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.critActionEvents, discordMessage);
}
exports.updatePriceTransactionMessage = updatePriceTransactionMessage;
function safetyCheckMessage() {
    const discordMessage = {
        message: '[CRIT] B11 - Price safety check returned false, please check it.',
        type: discordService_1.MESSAGE_TYPES.other,
        description: '[CRIT] B11 -  Price safety check returned false, deposit & withdraw actions will be reverted.',
    };
    (0, alertMessageSender_1.sendAlertMessage)({
        discord: discordMessage,
        pagerduty: {
            title: '[CRIT] B11 - Price safety check returned false',
            description: discordMessage.description,
            urgency: 'low',
        },
    });
}
exports.safetyCheckMessage = safetyCheckMessage;
