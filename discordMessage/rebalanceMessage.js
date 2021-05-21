const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessage,
    sendMessageToProtocolEventChannel,
} = require('../common/discord/discordService');

const { shortAccount, formatNumber } = require('../common/digitalUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

function rebalaneTriggerMessage(content) {
    const discordMessage = {
        type: MESSAGE_TYPES.pnlTrigger,
    };
    if (content.isRebalance) {
        discordMessage.message =
            'RebalanceTrigger return true, need run rebalance';
        discordMessage.description = `${MESSAGE_EMOJI.company} RebalanceTrigger return true, need run rebalance`;
    } else {
        discordMessage.message =
            "RebalanceTrigger return false, doesn't need run rebalance";
        discordMessage.description = `${MESSAGE_EMOJI.company} RebalanceTrigger return false, doesn't need run rebalance`;
    }

    logger.info(discordMessage.message);
    sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    // sendMessageToProtocolEventChannel(discordMessage);
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
    sendMessageToProtocolEventChannel(discordMessage);
}

function rebalanceTransactionMessage(content) {
    if (content.length === 0) return;
    const { type, msgLabel, hash, transactionReceipt, additionalData } =
        content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = shortAccount(hash);
    const stableBalance = `New stablecoin balances are: ${formatNumber(
        additionalData.stablecoinExposure[0] || 0,
        4,
        2
    )} DAI, ${formatNumber(
        additionalData.stablecoinExposure[1] || 0,
        4,
        2
    )} USDC, ${formatNumber(
        additionalData.stablecoinExposure[2] || 0,
        4,
        2
    )} USDT`;
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
        discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${action} action still pending`;
    } else if (!transactionReceipt.status) {
        discordMessage.message = `${type} transaction ${hash} reverted.`;
        discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${action} action is reverted`;
    }
    logger.info(discordMessage.message);
    sendMessageToProtocolEventChannel(discordMessage);
}

module.exports = {
    rebalaneTriggerMessage,
    rebalanceMessage,
    rebalanceTransactionMessage,
};
