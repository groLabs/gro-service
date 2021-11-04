"use strict";
const { MESSAGE_TYPES, MESSAGE_EMOJI, DISCORD_CHANNELS, sendMessage, sendMessageToChannel, } = require('../dist/common/discord/discordService').default;
const { shortAccount, formatNumber } = require('../common/digitalUtil');
const { sendAlertMessage } = require('../common/alertMessageSender');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function rebalanceTriggerMessage(content) {
    const discordMessage = {
        type: MESSAGE_TYPES.pnlTrigger,
    };
    if (content.isRebalance) {
        discordMessage.message =
            'RebalanceTrigger return true, need run rebalance';
        discordMessage.description = `${MESSAGE_EMOJI.company} RebalanceTrigger return true, need run rebalance`;
    }
    else {
        discordMessage.message =
            "RebalanceTrigger return false, doesn't need run rebalance";
        discordMessage.description = `${MESSAGE_EMOJI.company} RebalanceTrigger return false, doesn't need run rebalance`;
    }
    logger.info(discordMessage.message);
    sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
}
function rebalanceMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.rebalance,
        message: 'Calling rebalance function',
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling rebalance function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
        ],
    };
    sendMessageToChannel(DISCORD_CHANNELS.protocolEvents, discordMessage);
}
function rebalanceTransactionMessage(content) {
    if (content.length === 0)
        return;
    const { type, msgLabel, hash, transactionReceipt, additionalData } = content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = shortAccount(hash);
    const stableBalance = `New stablecoin balances are: ${formatNumber(additionalData.stablecoinExposure[0] || 0, 4, 2)} DAI, ${formatNumber(additionalData.stablecoinExposure[1] || 0, 4, 2)} USDC, ${formatNumber(additionalData.stablecoinExposure[2] || 0, 4, 2)} USDT`;
    const discordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain. ${stableBalance}`,
        description: `${MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain. ${stableBalance}`,
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
        sendMessageToChannel(DISCORD_CHANNELS.botLogs, discordMessage);
    }
    else if (!transactionReceipt.status) {
        discordMessage.description = `[WARN] B3 - ${label} ${action} txn reverted`;
        sendAlertMessage({
            discord: discordMessage,
        });
    }
    else {
        sendMessageToChannel(DISCORD_CHANNELS.protocolEvents, discordMessage);
    }
}
module.exports = {
    rebalanceTriggerMessage,
    rebalanceMessage,
    rebalanceTransactionMessage,
};
