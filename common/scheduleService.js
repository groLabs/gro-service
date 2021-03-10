'use strict';

const schedule = require('node-schedule')
const config = require('config')
const { getWeb3Instance } = require('./web3tool')
const logger = require('./logger')

const triggerBotAccountBalance = function() {
	schedule.scheduleJob('30 * * * * *', async function () {
		const botAccount = config.get('blockchain.bot_address')
		const balance = await getWeb3Instance().eth.getBalance(botAccount)
		logger.info(`bot: ${botAccount} balance ${balance.toString()}`)
	})
}

// triggerBotAccountBalance();