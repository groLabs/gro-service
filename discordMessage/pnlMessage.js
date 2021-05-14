const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessageToProtocolEventChannel,
} = require('../common/discord/discordService');

const { shortAccount } = require('../common/digitalUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

function pnlTriggerMessage(content) {
    const discordMessage = {
        type: MESSAGE_TYPES.pnlTrigger,
        message: 'No need run PnL.',
        description: `${MESSAGE_EMOJI.company} PnlTrigger false, totalAssetsChangeTrigger false, ExecPnl not needed`,
    };
    if (content.pnlTrigger) {
        discordMessage.message = 'PnlTrigger true, ExecPnl required';
        discordMessage.description = `${MESSAGE_EMOJI.company} PnlTrigger true, ExecPnl required`;
    }

    if (content.totalTrigger) {
        discordMessage.message =
            'TotalAssetsChangeTrigger true, ExecPnl required';
        discordMessage.description = `${MESSAGE_EMOJI.company} TotalAssetsChangeTrigger true, ExecPnl required`;
    }
    logger.info(discordMessage.message);
    sendMessageToProtocolEventChannel(discordMessage);
}

function pnlMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.pnl,
        message: 'Calling execPnL function',
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling execPnL function`,
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

function pnlTransactionMessage(content) {
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
    pnlTriggerMessage,
    pnlMessage,
    pnlTransactionMessage,
};
