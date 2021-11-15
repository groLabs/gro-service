import { MESSAGE_TYPES, MESSAGE_EMOJI, DISCORD_CHANNELS, sendMessage, sendMessageToChannel } from '../common/discord/discordService';
import { shortAccount, formatNumber } from '../common/digitalUtil';
import { IDiscordMessage } from './discordMessageTypes'

const botEnv = process.env.BOT_ENV?.toLowerCase();
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
    sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
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
    sendMessageToChannel(DISCORD_CHANNELS.protocolEvents, discordMessage);
}

function pnlTransactionMessage(content) {
    if (content.length === 0) return;
    const { type, msgLabel, hash, transactionReceipt, additionalData } =
        content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = shortAccount(hash);
    const discordMessage: IDiscordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain`,
        description: `${MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain`,
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
    } else if (!transactionReceipt.status) {
        discordMessage.message = `${type} transaction ${hash} reverted.`;
        discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${action} action is reverted`;
    }

    if (additionalData && additionalData.length > 0) {
        let pnlAmount = formatNumber(additionalData[1], 18, 2);
        const profitOrLoss = pnlAmount.indexOf('-') === 0 ? 'loss' : 'profit';
        pnlAmount = pnlAmount.replace('-', '');
        discordMessage.message = `${discordMessage.message} - $${pnlAmount} ${profitOrLoss} realized`;
        discordMessage.description = `${discordMessage.description} - $${pnlAmount} ${profitOrLoss} realized`;
    }

    logger.info(discordMessage.message);
    sendMessageToChannel(DISCORD_CHANNELS.protocolEvents, discordMessage);
}

export {
    pnlTriggerMessage,
    pnlMessage,
    pnlTransactionMessage,
};
