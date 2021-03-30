'use strict';

const { SettingError, DiscordError } = require('./customErrors');
const Discord = require('discord.js');
const config = require('config');
const logger = require('./logger');

const bot = new Discord.Client();

if (!config.has('discord.token')) {
    const err = new SettingError('Config: discord.token not set.');
    logger.error(err);
    throw err;
}

if (!config.has('discord.opt_channel')) {
    const err = new SettingError('Config: discord.opt_channel not set.');
    logger.error(err);
    throw err;
}

const TOKEN = config.get('discord.token');
const OPS_CHANNEL = config.get('discord.opt_channel');
let isBotReady = false;

bot.login(TOKEN);

bot.on('ready', () => {
    logger.info('Discord initilize ready!');
    isBotReady = true;
});

bot.on('error', (err) => {
    isBotReady = false;
    logger.error(err);
});

const formatMessage = function (obj) {
    let msg = `\`${obj.type}\`\n`;
    msg += `**Date**: ${obj.timestamp}\n`;
    if (obj.params) {
        msg += `**Params**: ${JSON.stringify(obj.params)}\n`;
    }

    msg += `**Result**: ${obj.result}\n`;
    if (obj.transactionHash) {
        msg += `Transaction: ${obj.transactionHash}`;
    }

    return msg;
};

const sendMessageToOPSChannel = async function (msg) {
    if (!isBotReady) {
        const err = new DiscordError('Bot not ready yet!');
        logger.error(err);
        return;
    }
    const channel = await bot.channels.fetch(OPS_CHANNEL);
    channel.send(msg);
};

const sendMessageWithFormat = async function (channelId, msgObj) {
    if (!isBotReady) {
        const err = new DiscordError('Bot not ready yet!');
        logger.error(err);
        return;
    }
    const channel = await bot.channels.fetch(channelId);
    channel.send(formatMessage(msgObj));
};

module.exports = {
    sendMessageToOPSChannel,
    sendMessageWithFormat,
};
