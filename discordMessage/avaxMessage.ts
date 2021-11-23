import BN from 'bignumber.js';
import { shortAccount, div, formatNumber } from '../common/digitalUtil';
import {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessage,
    sendMessageToChannel,
} from '../common/discord/discordService';
import { sendAlertMessage } from '../common/alertMessageSender';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

function tendMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.tend,
        message: 'Calling tend function',
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling tend function`,
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

function updateLimitMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.updateLimit,
        message: 'Calling update limit function',
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling update limit function`,
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

function forceCloseMessage(content) {
    const { transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.forceClose,
        message: 'Calling force close function',
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling force close function`,
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

module.exports = {
    tendMessage,
    updateLimitMessage,
    forceCloseMessage,
};
