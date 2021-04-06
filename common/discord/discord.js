'use strict';

const { DiscordError } = require('./discordError');
const { getConfig } = require('../configUtil');
const logger = require('../logger');
const Discord = require('discord.js');
const discordClient = new Discord.Client();

const TOKEN = getConfig('discord.token');
let isClientReady = false;

discordClient.login(TOKEN);

discordClient.on('ready', () => {
    logger.info('Discord initilize ready!');
    isClientReady = true;
});

discordClient.on('error', (err) => {
    isClientReady = false;
    logger.error(err);
});

const getDiscordClient = function () {
    if (isClientReady) return discordClient;
    const err = new DiscordError('Discord Service is not readly.');
    logger.error(err);
    throw err;
};

module.exports = {
    getDiscordClient,
};
