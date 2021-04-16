'use strict';

const { getConfig } = require('../configUtil');
const { getDiscordClient } = require('./discord');
const botEnv = process.env.BOT_ENV.toLowerCase();
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
    other: 'Others',
};

const formatMessage = function (obj) {
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

    return `${icon}**${obj.type || 'Others'}**\n` + '```' + msg + '```';
};

const sendMessage = async function (channelId, msgObj, retry = 0) {
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
};

const sendMessageToAlertChannel = function (error) {
    logger.error(error);
    const msgObj = {
        icon: ':warning:',
        message: error.message,
        type: error.messageTag,
        transactionHash: error.transactionHash,
    };
    if (error.messageTag == MESSAGE_TYPES.curveCheck) {
        sendMessageToCriticalEventChannel(msgObj);
    } else if (
        error.messageTag == MESSAGE_TYPES.miniStatsPersonal ||
        error.messageTag == MESSAGE_TYPES.depositEvent ||
        error.messageTag == MESSAGE_TYPES.withdrawEvent
    ) {
        sendMessageToTradeChannel(msgObj);
    } else if (error.messageTag == MESSAGE_TYPES.stats) {
        sendMessageToProtocolAssetChannel(msgObj);
    } else if (error.messageTag == MESSAGE_TYPES.other || !error.messageTag) {
        sendMessageToLogChannel(msgObj);
    } else {
        sendMessageToProtocolEventChannel(msgObj);
    }

    sendMessage(DISCORD_CHANNELS.botAlerts, msgObj);
};

const sendMessageToLogChannel = function (msgObj) {
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
};

const sendMessageToProtocolEventChannel = function (msgObj) {
    sendMessage(DISCORD_CHANNELS.protocolEvents, msgObj);
};

const sendMessageToCriticalEventChannel = function (msgObj) {
    sendMessage(DISCORD_CHANNELS.critActionEvents, msgObj);
};

const sendMessageToTradeChannel = function (msgObj) {
    sendMessage(DISCORD_CHANNELS.trades, msgObj);
};

const sendMessageToProtocolAssetChannel = function (msgObj) {
    sendMessage(DISCORD_CHANNELS.protocolAssets, msgObj);
};

module.exports = {
    DISCORD_CHANNELS,
    MESSAGE_TYPES,
    sendMessage,
    sendMessageToLogChannel,
    sendMessageToProtocolEventChannel,
    sendMessageToCriticalEventChannel,
    sendMessageToAlertChannel,
    sendMessageToTradeChannel,
    sendMessageToProtocolAssetChannel,
};
