const { MESSAGE_TYPES, DISCORD_CHANNELS, sendMessage, sendMessageToChannel, } = require('../dist/common/discord/discordService').default;
const { sendAlertMessage } = require('../common/alertMessageSender');
const stableCoin = ['DAI', 'USDC', 'USDT'];
function curvePriceMessage(content) {
    const { needStop, abnormalIndex } = content;
    let msg = `Curve price check returned ${needStop} `;
    if (needStop) {
        msg = `[EMERG] B10 - Curve price check returned false for ${stableCoin[abnormalIndex]}'s balance, need to decide whether set system to Emergency status`;
    }
    const discordMessage = {
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    };
    if (!needStop) {
        sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    }
    else {
        const pagerdutyBody = {
            title: '[EMERG] B10 - Curve price check returned false',
            description: msg,
        };
        sendAlertMessage({ discord: discordMessage, pagerduty: pagerdutyBody });
    }
}
function chainlinkPriceMessage(content) {
    const { needStop, abnormalIndex } = content;
    let msg = `Chainlink price check returned ${needStop} `;
    if (needStop) {
        msg = `[EMERG] B9 - Chainlink price check returned false for ${stableCoin[abnormalIndex]}'s price, need to decide whether set system to Emergency status`;
    }
    const discordMessage = {
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    };
    if (!needStop) {
        sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    }
    else {
        const pagerdutyBody = {
            title: '[EMERG] B9 - Chainlink price check returned false',
            description: msg,
        };
        sendAlertMessage({ discord: discordMessage, pagerduty: pagerdutyBody });
    }
}
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
        type: MESSAGE_TYPES.strategyCheck,
        description: msg,
    };
    if (strategyFailedTotal > 0) {
        sendMessageToChannel(DISCORD_CHANNELS.critActionEvents, discordMessage);
    }
    else {
        sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    }
}
module.exports = {
    chainlinkPriceMessage,
    curvePriceMessage,
    strategyCheckMessage,
};
