const {
    DISCORD_CHANNELS,
    sendMessageToChannel,
} = require('./discord/discordService');
const { createIncident } = require('../pagerduty/pagerdutyService');

function sendMessageToDiscord(discordMessage) {
    sendMessageToChannel(DISCORD_CHANNELS.botAlerts, discordMessage);
}

function triggerPagerdutyIncident(incidentContent) {
    createIncident(incidentContent);
}

function sendAlertMessage(messageBody) {
    if (messageBody.discord) {
        sendMessageToDiscord(messageBody.discord);
    }
    if (messageBody.pagerduty) {
        triggerPagerdutyIncident(messageBody.pagerduty);
    }
}

module.exports = {
    sendAlertMessage,
};
