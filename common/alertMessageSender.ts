import {
    DISCORD_CHANNELS,
    sendMessageToChannel,
} from '../common/discord/discordService';
import { IDiscordMessage } from '../discordMessage/discordMessageTypes';
import { getPagerdutyIncidentSender } from '../pagerduty/pagerdutyService';

type PagerdutyBody = {
    senderName?: string;
    title: string;
    details: string;
};

function sendMessageToDiscord(discordMessage: IDiscordMessage): void {
    sendMessageToChannel(DISCORD_CHANNELS.botAlerts, discordMessage);
}

function pagerdutySender(incidentContent: PagerdutyBody): any {
    const senderName = incidentContent.senderName || 'default_sender';
    return getPagerdutyIncidentSender(senderName).sendIncident(
        incidentContent.title,
        incidentContent.details
    );
}

function sendAlertMessage(messageBody: {
    pagerduty?: PagerdutyBody;
    discord: any;
}): void {
    if (messageBody.discord) {
        sendMessageToDiscord(messageBody.discord);
    }
    if (messageBody.pagerduty) {
        pagerdutySender(messageBody.pagerduty);
    }
}

export { PagerdutyBody, sendAlertMessage };
