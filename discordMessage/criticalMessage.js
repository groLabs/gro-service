const {
    MESSAGE_TYPES,
    sendMessageToCriticalEventChannel,
} = require('../common/discord/discordService');

function curvePriceMessage(content) {
    const safetyCheck = content.isSafety;
    let msg = `Curve price check is ${safetyCheck}`;
    if (!safetyCheck) {
        msg = `Curve price check is ${safetyCheck}, set system to **Stop** status`;
    }
    const discordMessage = {
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    };
    sendMessageToCriticalEventChannel(discordMessage);
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
    sendMessageToCriticalEventChannel(discordMessage);
}

module.exports = {
    curvePriceMessage,
    strategyCheckMessage,
};
