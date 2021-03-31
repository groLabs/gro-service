'use strict';

const { getConfig } = require('../common/configUtil');
const { getDiscordClient } = require('./discord');
const logger = require('../common/logger');
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
    miniStatsPersonal: 'Personal Stats',
    adjustNonce: 'Adjust Nonce',
    investTrigger: 'Invest Trigger',
    invest: 'Invest',
    harvestTrigger: 'Harvest Trigger',
    harvest: 'Harvest',
    pnlTrigger: 'Pnl Trigger',
    pnl: 'Pnl',
    rebalanceTrigger: 'Rebalance Trigger',
    rebalance: 'Rebalance',
    topup: 'Topup',
    curveCheck: 'Curve Check',
    stats: 'Generate Stats',
};

const formatMessage = function (obj) {
    let msg = `\`${obj.type}\`\n`;
    msg += `**Date**: ${obj.timestamp}\n`;
    if (obj.params) {
        msg += `**Params**: ${JSON.stringify(obj.params)}\n`;
    }
    if (obj.result || !obj.result) {
        msg += `**Result**: ${JSON.stringify(obj.result)}\n`;
    }

    if (obj.transactionHash) {
        msg += `Transaction: ${obj.transactionHash}`;
    }

    return msg;
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

module.exports = {
    DISCORD_CHANNELS,
    MESSAGE_TYPES,
    sendMessage,
};
