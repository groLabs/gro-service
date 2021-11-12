"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebalanceTransactionMessage = exports.rebalanceMessage = exports.rebalanceTriggerMessage = void 0;
const discordService_1 = require("../common/discord/discordService");
const digitalUtil_1 = require("../common/digitalUtil");
const alertMessageSender_1 = require("../common/alertMessageSender");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function rebalanceTriggerMessage(content) {
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.pnlTrigger,
    };
    if (content.isRebalance) {
        discordMessage.message =
            'RebalanceTrigger return true, need run rebalance';
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} RebalanceTrigger return true, need run rebalance`;
    }
    else {
        discordMessage.message =
            "RebalanceTrigger return false, doesn't need run rebalance";
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} RebalanceTrigger return false, doesn't need run rebalance`;
    }
    logger.info(discordMessage.message);
    (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
}
exports.rebalanceTriggerMessage = rebalanceTriggerMessage;
function rebalanceMessage(content) {
    const { transactionHash } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.rebalance,
        message: 'Calling rebalance function',
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling rebalance function`,
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
exports.rebalanceMessage = rebalanceMessage;
function rebalanceTransactionMessage(content) {
    if (content.length === 0)
        return;
    const { type, msgLabel, hash, transactionReceipt, additionalData } = content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = (0, digitalUtil_1.shortAccount)(hash);
    const stableBalance = `New stablecoin balances are: ${(0, digitalUtil_1.formatNumber)(additionalData.stablecoinExposure[0] || 0, 4, 2)} DAI, ${(0, digitalUtil_1.formatNumber)(additionalData.stablecoinExposure[1] || 0, 4, 2)} USDC, ${(0, digitalUtil_1.formatNumber)(additionalData.stablecoinExposure[2] || 0, 4, 2)} USDT`;
    const discordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain. ${stableBalance}`,
        description: `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain. ${stableBalance}`,
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
        discordMessage.description = `[WARN] B3 - ${label} ${action} txn reverted`;
        (0, alertMessageSender_1.sendAlertMessage)({
            discord: discordMessage,
        });
    }
    else {
        (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
    }
}
exports.rebalanceTransactionMessage = rebalanceTransactionMessage;
