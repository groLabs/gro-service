"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.pnlTransactionMessage = exports.pnlMessage = exports.pnlTriggerMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const digitalUtil_1 = require("../common/digitalUtil");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function pnlTriggerMessage(content) {
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.pnlTrigger,
        message: 'No need run PnL.',
        description: `${discordService_1.MESSAGE_EMOJI.company} PnlTrigger false, totalAssetsChangeTrigger false, ExecPnl not needed`,
    };
    if (content.pnlTrigger) {
        discordMessage.message = 'PnlTrigger true, ExecPnl required';
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} PnlTrigger true, ExecPnl required`;
    }
    if (content.totalTrigger) {
        discordMessage.message =
            'TotalAssetsChangeTrigger true, ExecPnl required';
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} TotalAssetsChangeTrigger true, ExecPnl required`;
    }
    logger.info(discordMessage.message);
    (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
}
exports.pnlTriggerMessage = pnlTriggerMessage;
function pnlMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.pnl,
        message: 'Calling execPnL function',
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling execPnL function`,
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
exports.pnlMessage = pnlMessage;
function pnlTransactionMessage(content) {
    if (content.length === 0)
        return;
    const { type, msgLabel, hash, transactionReceipt, additionalData } = content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = (0, digitalUtil_1.shortAccount)(hash);
    const discordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain`,
        description: `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain`,
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
    }
    else if (!transactionReceipt.status) {
        discordMessage.message = `${type} transaction ${hash} reverted.`;
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action is reverted`;
    }
    if (additionalData && additionalData.length > 0) {
        let pnlAmount = (0, digitalUtil_1.formatNumber)(additionalData[1], 18, 2);
        const profitOrLoss = pnlAmount.indexOf('-') === 0 ? 'loss' : 'profit';
        pnlAmount = pnlAmount.replace('-', '');
        discordMessage.message = `${discordMessage.message} - $${pnlAmount} ${profitOrLoss} realized`;
        discordMessage.description = `${discordMessage.description} - $${pnlAmount} ${profitOrLoss} realized`;
    }
    logger.info(discordMessage.message);
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
exports.pnlTransactionMessage = pnlTransactionMessage;
