const {
    DISCORD_CHANNELS,
    sendMessageToChannel,
} = require('./discord/discordService');

function sendMessageToDiscord(discordMessage) {
    sendMessageToChannel(DISCORD_CHANNELS.botAlerts, discordMessage);
}

function triggerPagerdutyIncident() {}

function sendAlertMessage(messageBody) {
    if (messageBody.discord) {
        sendMessageToDiscord(messageBody.discord);
    }

    if (messageBody.pagerduty) {
        triggerPagerdutyIncident();
    }
}

module.exports = {
    sendAlertMessage,
};
