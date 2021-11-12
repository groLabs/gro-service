"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyCheckMessage = exports.curvePriceMessage = exports.chainlinkPriceMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const alertMessageSender_1 = require("../common/alertMessageSender");
const stableCoin = ['DAI', 'USDC', 'USDT'];
function curvePriceMessage(content) {
    const { needStop, abnormalIndex } = content;
    let msg = `Curve price check returned ${needStop} `;
    if (needStop) {
        msg = `[EMERG] B10 - Curve price check returned false for ${stableCoin[abnormalIndex]}'s balance, need to decide whether set system to Emergency status`;
    }
    const discordMessage = {
        message: msg,
        type: discordService_1.MESSAGE_TYPES.curveCheck,
        description: msg,
    };
    if (!needStop) {
        (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
    }
    else {
        const pagerdutyBody = {
            title: '[EMERG] B10 - Curve price check returned false',
            description: msg,
        };
        (0, alertMessageSender_1.sendAlertMessage)({ discord: discordMessage, pagerduty: pagerdutyBody });
    }
}
exports.curvePriceMessage = curvePriceMessage;
function chainlinkPriceMessage(content) {
    const { needStop, abnormalIndex } = content;
    let msg = `Chainlink price check returned ${needStop} `;
    if (needStop) {
        msg = `[EMERG] B9 - Chainlink price check returned false for ${stableCoin[abnormalIndex]}'s price, need to decide whether set system to Emergency status`;
    }
    const discordMessage = {
        message: msg,
        type: discordService_1.MESSAGE_TYPES.curveCheck,
        description: msg,
    };
    if (!needStop) {
        (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
    }
    else {
        const pagerdutyBody = {
            title: '[EMERG] B9 - Chainlink price check returned false',
            description: msg,
        };
        (0, alertMessageSender_1.sendAlertMessage)({ discord: discordMessage, pagerduty: pagerdutyBody });
    }
}
exports.chainlinkPriceMessage = chainlinkPriceMessage;
function strategyCheckMessage(content) {
    const strategyFailedTotal = content.failedNumber;
    let msg = 'All strategies are healthy';
    if (strategyFailedTotal === 1) {
        msg =
            'Have one abnormal strategy, and the system enters **stop** status';
    }
    else if (strategyFailedTotal > 1) {
        msg =
            'At least 2 strategies are abnormal, and the system enters **full stop** status';
    }
    const discordMessage = {
        message: msg,
        type: discordService_1.MESSAGE_TYPES.strategyCheck,
        description: msg,
    };
    if (strategyFailedTotal > 0) {
        (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.critActionEvents, discordMessage);
    }
    else {
        (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
    }
}
exports.strategyCheckMessage = strategyCheckMessage;
