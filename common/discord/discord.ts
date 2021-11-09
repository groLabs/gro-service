import Discord from 'discord.js';

import DiscordError from './discordError';
import { getConfig } from '../configUtil';

const botEnv = process.env.BOT_ENV?.toLowerCase();
const discordClient = new Discord.Client();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);

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

export function getDiscordClient() {
    if (isClientReady) return discordClient;
    const err = new DiscordError('Discord Service is not readly.');
    logger.error(err);
    throw err;
}
