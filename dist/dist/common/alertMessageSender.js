"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAlertMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const pagerdutyService_1 = require("../pagerduty/pagerdutyService");
function sendMessageToDiscord(discordMessage) {
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.botAlerts, discordMessage);
}
function triggerPagerdutyIncident(incidentContent) {
    (0, pagerdutyService_1.createIncident)(incidentContent);
}
function sendAlertMessage(messageBody) {
    if (messageBody.discord) {
        sendMessageToDiscord(messageBody.discord);
    }
    if (messageBody.pagerduty) {
        triggerPagerdutyIncident(messageBody.pagerduty);
    }
}
exports.sendAlertMessage = sendAlertMessage;
