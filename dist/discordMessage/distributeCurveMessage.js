"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeCurveVaultTransactionMessage = exports.distributeMessage = exports.withdrawMessage = exports.distributeCurveVaultTriggerMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const digitalUtil_1 = require("../common/digitalUtil");
const alertMessageSender_1 = require("../common/alertMessageSender");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function distributeCurveVaultTriggerMessage(content) {
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.distributeCurveVault,
    };
    if (content.needCall) {
        const { amount } = content.params;
        discordMessage.message = `Curve's asset already has ${amount}, need distribute to vault`;
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} Curve's asset already has ${amount}, need distribute to vault`;
    }
    else {
        discordMessage.message =
            "distributeCurveVaultTrigger return false, doesn't need run distribution";
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} distributeCurveVaultTrigger return false, doesn't need run distribution`;
    }
    logger.info(discordMessage.message);
    (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
}
exports.distributeCurveVaultTriggerMessage = distributeCurveVaultTriggerMessage;
function withdrawMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.distributeCurveVault,
        message: "Calling curve vault's withdrawToAdapter function",
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling curve adapter's withdrawToAdapter function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
exports.withdrawMessage = withdrawMessage;
function distributeMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.distributeCurveVault,
        message: "Calling controller's distributeCurveAssets function",
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling controller's distributeCurveAssets function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
exports.distributeMessage = distributeMessage;
function distributeCurveVaultTransactionMessage(content) {
    if (content.length === 0)
        return;
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt } = content[i];
        const typeItems = type.split('-');
        let action = typeItems[0];
        action = action.replace(action[0], action[0].toUpperCase());
        const label = (0, digitalUtil_1.shortAccount)(hash);
        const discordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain.`,
            description: `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain.`,
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
            discordMessage.description = `[WARN] B15 - ${label} ${action} txn reverted`;
            (0, alertMessageSender_1.sendAlertMessage)({
                discord: discordMessage,
            });
        }
        else {
            (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
        }
    }
}
exports.distributeCurveVaultTransactionMessage = distributeCurveVaultTransactionMessage;
