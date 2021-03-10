'use strict';

const Discord = require('discord.js');
const config = require('config')
const logger = require('../common/logger')
const { SettingError, DiscordError } = require('../common/customErrors')

const bot = new Discord.Client();
if(!config.has('discord.token')){
	const err = new SettingError('Config: discord.token not set.')
	logger.error(err)
	throw err
}

if(!config.has('discord.opt_channel')){
	const err = new SettingError('Config: discord.opt_channel not set.')
	logger.error(err)
	throw err
}

const TOKEN = config.get('discord.token')
const OPS_CHANNEL = config.get('discord.opt_channel')
let isBotReady = false

bot.login(TOKEN)

bot.on('ready', () => {
	logger.info('Discord initilize ready!');
	isBotReady = true
})

bot.on('error', (err) => {
	isBotReady = false
	logger.error(err)
})

const sendMessageToOPSChannel = async function (msg) {
	if(!isBotReady) {
		const err = new DiscordError('Bot not ready yet!')
		logger.error(err)
		return
	}
	const channel = await bot.channels.fetch(OPS_CHANNEL)
	channel.send(msg)
}

module.exports = {
	sendMessageToOPSChannel,
}
