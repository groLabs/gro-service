import { MESSAGE_TYPES, MESSAGE_EMOJI, DISCORD_CHANNELS, sendMessage, sendMessageToChannel } from '../common/discord/discordService';
import { shortAccount } from '../common/digitalUtil';
import { sendAlertMessage } from '../common/alertMessageSender';
import { IDiscordMessage } from './discordMessageTypes'

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

function distributeCurveVaultTriggerMessage(content) {
    const discordMessage: IDiscordMessage = {
        type: MESSAGE_TYPES.distributeCurveVault,
    };
    if (content.needCall) {
        const { amount } = content.params;
        discordMessage.message = `Curve's asset already has ${amount}, need distribute to vault`;
        discordMessage.description = `${MESSAGE_EMOJI.company} Curve's asset already has ${amount}, need distribute to vault`;
    } else {
        discordMessage.message =
            "distributeCurveVaultTrigger return false, doesn't need run distribution";
        discordMessage.description = `${MESSAGE_EMOJI.company} distributeCurveVaultTrigger return false, doesn't need run distribution`;
    }

    logger.info(discordMessage.message);
    sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
}

function withdrawMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage: IDiscordMessage = {
        type: MESSAGE_TYPES.distributeCurveVault,
        message: "Calling curve vault's withdrawToAdapter function",
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling curve adapter's withdrawToAdapter function`,
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

function distributeMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage: IDiscordMessage = {
        type: MESSAGE_TYPES.distributeCurveVault,
        message: "Calling controller's distributeCurveAssets function",
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling controller's distributeCurveAssets function`,
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

function distributeCurveVaultTransactionMessage(content) {
    if (content.length === 0) return;
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt } = content[i];
        const typeItems = type.split('-');
        let action = typeItems[0];
        action = action.replace(action[0], action[0].toUpperCase());
        const label = shortAccount(hash);
        const discordMessage: IDiscordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain.`,
            description: `${MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain.`,
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
        } else if (!transactionReceipt.status) {
            discordMessage.description = `[WARN] B15 - ${label} ${action} txn reverted`;
            sendAlertMessage({
                discord: discordMessage,
            });
        } else {
            sendMessageToChannel(
                DISCORD_CHANNELS.protocolEvents,
                discordMessage
            );
        }
    }
}

export {
    distributeCurveVaultTriggerMessage,
    withdrawMessage,
    distributeMessage,
    distributeCurveVaultTransactionMessage,
};
