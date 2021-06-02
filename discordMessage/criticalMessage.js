const {
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
    sendMessage,
    sendMessageToChannel,
} = require('../common/discord/discordService');

function curvePriceMessage(content) {
    const { needStop, abnormalIndex } = content;
    let msg = `Curve price check is ${needStop}, no need stop`;
    if (needStop) {
        msg = `Curve price check is ${needStop}, abnormalIndex ${abnormalIndex} set system to **Stop** status`;
    }
    const discordMessage = {
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    };

    if (!needStop) {
        sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    } else {
        sendMessageToChannel(DISCORD_CHANNELS.critActionEvents, discordMessage);
    }
}

function strategyCheckMessage(content) {
    const strategyFailedTotal = content.failedNumber;
    let msg = 'All strategies are healthy';
    if (strategyFailedTotal === 1) {
        msg =
            'Have one abnormal strategy, and the system enters **stop** status';
    } else if (strategyFailedTotal > 1) {
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
    } else {
        sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    }
}

module.exports = {
    curvePriceMessage,
    strategyCheckMessage,
};
