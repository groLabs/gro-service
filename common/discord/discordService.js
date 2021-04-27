const { getConfig } = require('../configUtil');
const { getDiscordClient } = require('./discord');

const botEnv = process.env.BOT_ENV.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const RETRY_TIMES = getConfig('discord.retry', false) || 2;
const RESEND_DELAY_SETTING = getConfig('discord.resend_delay', false) || 2000;

const DISCORD_CHANNELS = {};
DISCORD_CHANNELS.trades = getConfig('discord.channel.trades');
DISCORD_CHANNELS.protocolAssets = getConfig('discord.channel.protocol_assets');
DISCORD_CHANNELS.protocolEvents = getConfig('discord.channel.protocol_events');
DISCORD_CHANNELS.critActionEvents = getConfig(
    'discord.channel.crit_action_events'
);
DISCORD_CHANNELS.botAlerts = getConfig('discord.channel.bot_alerts');
DISCORD_CHANNELS.botLogs = getConfig('discord.channel.bot_logs');

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
    stats: 'Generate Stats',
    regularBot: 'Harvest Bot',
    statsBot: 'Stats Bot',
    criticalBot: 'Critical Bot',
    other: 'Others',
};

const MESSAGE_EMOJI = {};
MESSAGE_EMOJI.Gvt = getConfig('emoji.gvt', false) || ':Vault:';
MESSAGE_EMOJI.Pwrd = getConfig('emoji.pwrd', false) || ':GRO:';
MESSAGE_EMOJI.error = getConfig('emoji.error', false) || ':x:';
MESSAGE_EMOJI.reverted = getConfig('emoji.reverted', false) || ':warning:';
MESSAGE_EMOJI[MESSAGE_TYPES.miniStatsPersonal] =
    getConfig('emoji.miniStatsPersonal', false) || ':bar_chart:';
MESSAGE_EMOJI[MESSAGE_TYPES.stats] =
    getConfig('emoji.stats', false) || ':bar_chart:';
MESSAGE_EMOJI[MESSAGE_TYPES.depositEvent] =
    getConfig('emoji.depositEvent', false) || ':chart_with_upwards_trend:';
MESSAGE_EMOJI[MESSAGE_TYPES.withdrawEvent] =
    getConfig('emoji.withdrawEvent', false) || ':chart_with_downwards_trend:';
MESSAGE_EMOJI[MESSAGE_TYPES.transferEvent] =
    getConfig('emoji.transferEvent', false) || ':left_right_arrow:';
MESSAGE_EMOJI[MESSAGE_TYPES.investTrigger] =
    getConfig('emoji.investTrigger', false) || ':inbox_tray:';
MESSAGE_EMOJI[MESSAGE_TYPES.curveInvestTrigger] =
    getConfig('emoji.curveInvestTrigger', false) || ':inbox_tray:';
MESSAGE_EMOJI[MESSAGE_TYPES.invest] =
    getConfig('emoji.invest', false) || ':inbox_tray:';
MESSAGE_EMOJI[MESSAGE_TYPES.curveInvest] =
    getConfig('emoji.curveInvest', false) || ':inbox_tray:';
MESSAGE_EMOJI[MESSAGE_TYPES.harvestTrigger] =
    getConfig('emoji.harvestTrigger', false) || ':hammer_pick:';
MESSAGE_EMOJI[MESSAGE_TYPES.harvest] =
    getConfig('emoji.harvest', false) || ':hammer_pick:';
MESSAGE_EMOJI[MESSAGE_TYPES.pnlTrigger] =
    getConfig('emoji.pnlTrigger', false) || ':moneybag:';
MESSAGE_EMOJI[MESSAGE_TYPES.pnl] =
    getConfig('emoji.pnl', false) || ':moneybag:';
MESSAGE_EMOJI[MESSAGE_TYPES.rebalanceTrigger] =
    getConfig('emoji.rebalanceTrigger', false) || ':scales:';
MESSAGE_EMOJI[MESSAGE_TYPES.rebalance] =
    getConfig('emoji.rebalance', false) || ':scales:';
MESSAGE_EMOJI[MESSAGE_TYPES.regularBot] =
    getConfig('emoji.regularBot', false) || ':robot:';
MESSAGE_EMOJI[MESSAGE_TYPES.statsBot] =
    getConfig('emoji.statsBot', false) || ':robot:';
MESSAGE_EMOJI[MESSAGE_TYPES.criticalBot] =
    getConfig('emoji.criticalBot', false) || ':robot:';

function generateLink(urlDetail) {
    const nodeEnv = process.env.NODE_ENV.toLowerCase();
    let host = 'https://kovan.etherscan.io';
    if (nodeEnv === 'mainnet') {
        host = 'https://etherscan.io';
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
        channel.send({ embed: generateEmbedMessage(msgObj) });
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
        channel.send(formatMessage(msgObj));
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

function sendMessageToLogChannel(msgObj) {
    if (!msgObj.emojis) {
        msgObj.emojis = [];
    }
    msgObj.emojis.unshift(MESSAGE_EMOJI[msgObj.type]);
    sendEmbedMessage(DISCORD_CHANNELS.botLogs, msgObj);
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}

function sendMessageToProtocolEventChannel(msgObj) {
    if (!msgObj.emojis) {
        msgObj.emojis = [];
    }
    msgObj.emojis.unshift(MESSAGE_EMOJI[msgObj.type]);
    sendEmbedMessage(DISCORD_CHANNELS.protocolEvents, msgObj);
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}

function sendMessageToCriticalEventChannel(msgObj) {
    sendMessage(DISCORD_CHANNELS.critActionEvents, msgObj);
}

function sendMessageToTradeChannel(msgObj) {
    if (!msgObj.emojis) {
        msgObj.emojis = [];
    }
    msgObj.emojis.unshift(MESSAGE_EMOJI[msgObj.type]);
    sendEmbedMessage(DISCORD_CHANNELS.trades, msgObj);
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}

function sendMessageToProtocolAssetChannel(msgObj) {
    if (!msgObj.emojis) {
        msgObj.emojis = [];
    }
    msgObj.emojis.unshift(MESSAGE_EMOJI[msgObj.type]);
    sendEmbedMessage(DISCORD_CHANNELS.protocolAssets, msgObj);
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}

function sendMessageToAlertChannel(error) {
    logger.error(error);
    const msgObj = {
        icon: ':warning:',
        message: error.message,
        type: error.messageTag,
        description: error.message,
        emojis: [MESSAGE_EMOJI.error],
        transactionHash: error.transactionHash,
    };

    if (error.messageTag === MESSAGE_TYPES.curveCheck) {
        sendMessageToCriticalEventChannel(msgObj);
    } else if (
        error.messageTag === MESSAGE_TYPES.miniStatsPersonal ||
        error.messageTag === MESSAGE_TYPES.depositEvent ||
        error.messageTag === MESSAGE_TYPES.withdrawEvent
    ) {
        sendMessageToTradeChannel(msgObj);
    } else if (error.messageTag === MESSAGE_TYPES.stats) {
        sendMessageToProtocolAssetChannel(msgObj);
    } else if (error.messageTag === MESSAGE_TYPES.other || !error.messageTag) {
        sendMessageToLogChannel(msgObj);
    } else {
        sendMessageToProtocolEventChannel(msgObj);
    }

    sendMessage(DISCORD_CHANNELS.botAlerts, msgObj);
}

module.exports = {
    DISCORD_CHANNELS,
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessage,
    sendMessageToLogChannel,
    sendMessageToProtocolEventChannel,
    sendMessageToCriticalEventChannel,
    sendMessageToAlertChannel,
    sendMessageToTradeChannel,
    sendMessageToProtocolAssetChannel,
};
