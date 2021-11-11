import { DISCORD_CHANNELS, sendMessageToChannel } from '../common/discord/discordService';
import { createIncident } from '../pagerduty/pagerdutyService';

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

export {
    sendAlertMessage,
};
