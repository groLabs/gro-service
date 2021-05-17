const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessage,
    sendMessageToProtocolEventChannel,
} = require('../common/discord/discordService');

const { shortAccount } = require('../common/digitalUtil');

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
    const { type, msgLabel, hash, transactionReceipt } = content[0];
    const typeItems = type.split('-');
    const label = shortAccount(hash);
    const discordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain`,
        description: `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action confirmed to chain`,
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
        discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action still pending`;
    } else if (!transactionReceipt.status) {
        discordMessage.message = `${type} transaction ${hash} reverted.`;
        discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action is reverted`;
    }
    logger.info(discordMessage.message);
    sendMessageToProtocolEventChannel(discordMessage);
}

module.exports = {
    rebalaneTriggerMessage,
    rebalanceMessage,
    rebalanceTransactionMessage,
};
