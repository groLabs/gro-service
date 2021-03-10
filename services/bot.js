'use strict';

const { SettingError } = require('../common/customErrors');
const { getWeb3Instance } = require('../common/web3tool')
const { callRebalanceTrigger } = require('./IInsurance')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')

let subscription

const subscribeNewBlock = function () {
	subscription = getWeb3Instance().eth.subscribe('newBlockHeaders', function(error, result){
		if(error) {
			throw new Error('Subscribe newBlockHeaders failed')
		}
	}).on('data', async function(blockHeader){
		logger.info('Block Number: ' + blockHeader.number)
		// call RebalanceTrigger
		const rebalanceTrigger = await callRebalanceTrigger()
		logger.info('rebalanceTrigger: ' + JSON.stringify(rebalanceTrigger))
		sendMessageToOPSChannel('trigger called')
	})
	return 1
}

const unsubscribe = async function() {
	if(!subscription){
		throw new SettingError('subscription not setting')
	}
	await subscription.unsubscribe()
	logger.info('Successfully unsubscribed!');
	subscription = undefined
	return 1
}


module.exports = {
	subscribeNewBlock,
	unsubscribe
}
