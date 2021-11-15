"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.investTransactionMessage = exports.investMessage = exports.investTriggerMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const allContracts_1 = require("../contract/allContracts");
const digitalUtil_1 = require("../common/digitalUtil");
const alertMessageSender_1 = require("../common/alertMessageSender");
function investTriggerMessage(content) {
    const { vaultName, vaultAddress, isInvested } = content;
    let msg = `${vaultName}'s investTrigger return false, doesn't need run invest`;
    if (isInvested) {
        msg = `${vaultName}'s investTrigger return true, need run invest`;
    }
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.investTrigger,
        message: msg,
        description: msg,
        urls: [
            {
                label: vaultName,
                type: 'account',
                value: vaultAddress,
            },
        ],
    };
    (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
}
exports.investTriggerMessage = investTriggerMessage;
function investMessage(content) {
    const { vaultName, vaultAddress, transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.invest,
        message: `Call ${vaultName}:${vaultAddress}'s invest function`,
        description: `${txLabel} Call ${vaultName}'s invest function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
            {
                label: vaultName,
                type: 'account',
                value: vaultAddress,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
exports.investMessage = investMessage;
function investTransactionMessage(content) {
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt, additionalData } = content[i];
        const typeItems = type.split('-');
        let action = typeItems[0];
        action = action.replace(action[0], action[0].toUpperCase());
        const vaultName = (0, allContracts_1.getVaultAndStrategyLabels)()[typeItems[1]].name;
        const label = (0, digitalUtil_1.shortAccount)(hash);
        const discordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain - $${additionalData} invested`,
            description: `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action for ${vaultName} confirmed to chain - $${additionalData} invested`,
            urls: [
                {
                    label,
                    type: 'tx',
                    value: hash,
                },
            ],
        };
        if (!transactionReceipt) {
            discordMessage.message = `${type} transaction: ${hash} is still pending.`;
            discordMessage.description = undefined;
            (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
        }
        else if (!transactionReceipt.status) {
            discordMessage.description = `[WARN] B1 - ${label} ${action} action for ${vaultName} reverted`;
            (0, alertMessageSender_1.sendAlertMessage)({
                discord: discordMessage,
            });
        }
        else {
            (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
        }
    }
}
exports.investTransactionMessage = investTransactionMessage;
