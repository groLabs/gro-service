import { TextChannel } from 'discord.js';
import { getConfig } from '../configUtil';
import { getDiscordClient } from './discord';

const botEnv = process.env.BOT_ENV?.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const RETRY_TIMES = getConfig('discord.retry', false) as number || 2;
const RESEND_DELAY_SETTING = getConfig('discord.resend_delay', false) as number || 2000;

interface DiscordChannels {
    trades: string;
    protocolAssets: string;
    protocolEvents: string;
    critActionEvents: string;
    botAlerts: string;
    botLogs: string;
}

const DISCORD_CHANNELS: DiscordChannels = {} as DiscordChannels;
DISCORD_CHANNELS.trades = getConfig('discord.channel.trades') as string;
DISCORD_CHANNELS.protocolAssets = getConfig('discord.channel.protocol_assets') as string;
DISCORD_CHANNELS.protocolEvents = getConfig('discord.channel.protocol_events') as string;
DISCORD_CHANNELS.critActionEvents = getConfig(
    'discord.channel.crit_action_events'
) as string;
DISCORD_CHANNELS.botAlerts = getConfig('discord.channel.bot_alerts') as string;
DISCORD_CHANNELS.botLogs = getConfig('discord.channel.bot_logs') as string;

const MESSAGE_TYPES = {
    depositEvent: 'Deposit Event',
    withdrawEvent: 'Withdraw Event',
    transferEvent: 'Transfer',
    miniStatsPersonal: 'Personal Stats',
    adjustNonce: 'Adjust Nonce',
    investTrigger: 'Invest Trigger',
    curveInvestTrigger: 'Curve Invest Trigger',
    invest: 'Invest',
    curveInvest: 'Curve Invest',
    harvestTrigger: 'Harvest Trigger',
    harvest: 'Harvest',
    pnlTrigger: 'Pnl Trigger',
    pnl: 'Pnl',
    rebalanceTrigger: 'Rebalance Trigger',
    rebalance: 'Rebalance',
    topup: 'Topup',
    curveCheck: 'Curve Check',
    strategyCheck: 'Strategy Price Check',
    stats: 'Generate Stats',
    regularBot: 'Harvest Bot',
    statsBot: 'Stats Bot',
    criticalBot: 'Critical Bot',
    chainPrice: 'Update Chain Price',
    totalAssetsChange: 'Total Assets Change',
    strategyAssets: 'Strategy Assets',
    distributeCurveVault: 'Distribute Curve Vault',
    tend: 'tend',
    forceClose: 'Force Close',
    updateLimit: 'Update Limit',
    other: 'Others',
};

type MessageTypes = typeof MESSAGE_TYPES

interface MessageEmoji extends MessageTypes {
    Vault: string;
    PWRD: string;
    error: string;
    company: string;
    reverted: string;


}

const MESSAGE_EMOJI: MessageEmoji = {} as MessageEmoji;
MESSAGE_EMOJI.Vault =
    getConfig('emoji.gvt', false) as string || '<:Vault:834796096797802507>';
MESSAGE_EMOJI.PWRD =
    getConfig('emoji.pwrd', false) as string || '<:PWRD:834796096915767306>';
MESSAGE_EMOJI.error = getConfig('emoji.error', false) as string || '';
MESSAGE_EMOJI.company =
    getConfig('emoji.company', false) as string || '<:GRO:834796096685211689>';
MESSAGE_EMOJI.reverted = getConfig('emoji.reverted', false) as string || '';
MESSAGE_EMOJI[MESSAGE_TYPES.miniStatsPersonal] =
    getConfig('emoji.miniStatsPersonal', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.stats] = getConfig('emoji.stats', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.depositEvent] =
    getConfig('emoji.depositEvent', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.withdrawEvent] =
    getConfig('emoji.withdrawEvent', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.transferEvent] =
    getConfig('emoji.transferEvent', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.investTrigger] =
    getConfig('emoji.investTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.curveInvestTrigger] =
    getConfig('emoji.curveInvestTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.invest] = getConfig('emoji.invest', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.curveInvest] =
    getConfig('emoji.curveInvest', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.harvestTrigger] =
    getConfig('emoji.harvestTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.harvest] = getConfig('emoji.harvest', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.pnlTrigger] =
    getConfig('emoji.pnlTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.pnl] = getConfig('emoji.pnl', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.rebalanceTrigger] =
    getConfig('emoji.rebalanceTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.rebalance] =
    getConfig('emoji.rebalance', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.curveCheck] =
    getConfig('emoji.curveCheck', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.regularBot] =
    getConfig('emoji.regularBot', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.statsBot] =
    getConfig('emoji.statsBot', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.criticalBot] =
    getConfig('emoji.criticalBot', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.chainPrice] =
    getConfig('emoji.curveCheck', false) || '';

function generateLink(urlDetail) {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    let host = `https://${nodeEnv}.etherscan.io`;
    if (nodeEnv === 'mainnet') {
        host = 'https://etherscan.io';
    }
    if (nodeEnv === 'avax') {
        host = 'https://snowtrace.io';
    }

    let url = '';
    switch (urlDetail.type) {
        case 'account':
            url = `${host}/address/${urlDetail.value}`;
            break;
        case 'tx':
            url = `${host}/tx/${urlDetail.value}`;
            break;
        default:
            logger.warn(`Not fund url type: ${urlDetail.type}`);
    }
    return url;
}

function generateEmbedMessage(obj) {
    logger.info(`embed msg: ${JSON.stringify(obj)}`);
    const prefixEmojis = obj.emojis.join(' ');

    if (obj.urls) {
        for (let i = 0; i < obj.urls.length; i += 1) {
            const urlInfo = obj.urls[i];
            const { label } = urlInfo;
            const link = `[${label}](${generateLink(urlInfo)})`;
            obj.description = obj.description.replace(label, link);
        }
    }
    return { description: `${prefixEmojis} ${obj.description}` };
}

function formatMessage(obj) {
    let msg = '';
    msg += `Message: ${obj.message}\n`;
    msg += `Date: ${obj.timestamp}\n`;
    if (obj.params) {
        msg += `Params: ${JSON.stringify(obj.params)}\n`;
    }
    if (obj.result) {
        msg += `Result: ${JSON.stringify(obj.result)}\n`;
    }

    if (obj.transactionHash) {
        msg += `Transaction: ${obj.transactionHash}`;
    }

    const icon = obj.icon || '';

    return `${icon}**${obj.type || 'Others'}**\n${'```'}${msg}${'```'}`;
}

async function sendEmbedMessage(channelId, msgObj, retry = 0) {
    if (!msgObj.description) return;
    if (retry > RETRY_TIMES) {
        logger.info(
            `Discord message retry: ${retry} channel:${channelId}; msg: ${JSON.stringify(
                msgObj
            )}`
        );
        return;
    }
    try {
        const discordClient = getDiscordClient();
        const channel = await discordClient.channels.fetch(channelId);
        (channel as TextChannel).send({ embed: generateEmbedMessage(msgObj) });
    } catch (error) {
        logger.error(error);
        setTimeout(
            sendEmbedMessage,
            RESEND_DELAY_SETTING,
            channelId,
            msgObj,
            retry + 1
        );
    }
}

async function sendMessage(channelId, msgObj, retry = 0) {
    if (!msgObj.message) return;
    if (retry > RETRY_TIMES) {
        logger.info(
            `Discord message retry: ${retry} channel:${channelId}; msg: ${JSON.stringify(
                msgObj
            )}`
        );
        return;
    }
    if (!msgObj.timestamp) msgObj.timestamp = new Date();
    try {
        const discordClient = getDiscordClient();
        const channel = await discordClient.channels.fetch(channelId);
        (channel as TextChannel).send(formatMessage(msgObj));
    } catch (error) {
        logger.error(error);
        setTimeout(
            sendMessage,
            RESEND_DELAY_SETTING,
            channelId,
            msgObj,
            retry + 1
        );
    }
}

function sendMessageToChannel(channel, msgObj) {
    if (!msgObj.emojis) {
        msgObj.emojis = [];
    }
    if (channel !== DISCORD_CHANNELS.botAlerts) {
        msgObj.emojis.unshift(MESSAGE_EMOJI[msgObj.type]);
    }
    sendEmbedMessage(channel, msgObj);
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}

function sendMessageToAlertChannel(error) {
    logger.error(error);
    const msgObj = {
        icon: ':warning:',
        message: error.message,
        type: error.messageTag,
        description: error.embedMessage,
        emojis: [MESSAGE_EMOJI.error],
        transactionHash: error.transactionHash,
    };
    sendEmbedMessage(DISCORD_CHANNELS.botLogs, msgObj);
    sendMessage(DISCORD_CHANNELS.botAlerts, msgObj);
}

function sendErrorMessageToLogChannel(error) {
    logger.error(error);
    const msgObj = {
        icon: ':warning:',
        message: error.message,
        type: error.messageTag,
        description: error.embedMessage,
        emojis: [MESSAGE_EMOJI.error],
        transactionHash: error.transactionHash,
    };
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}

export {
    DISCORD_CHANNELS,
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessage,
    sendEmbedMessage,
    sendMessageToChannel,
    sendMessageToAlertChannel,
    sendErrorMessageToLogChannel,
};
