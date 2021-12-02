import { DISCORD_CHANNELS, sendMessageToChannel } from '../common/discord/discordService';
import { IDiscordMessage } from '../discordMessage/discordMessageTypes';
import { createIncident } from '../pagerduty/pagerdutyService';

function sendMessageToDiscord(discordMessage: IDiscordMessage): void {
    sendMessageToChannel(DISCORD_CHANNELS.botAlerts, discordMessage);
}

function triggerPagerdutyIncident(incidentContent: any): void {
    createIncident(incidentContent);
}

function sendAlertMessage(messageBody: { pagerduty?: any; discord: any; }): void {
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
