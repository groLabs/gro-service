'use strict'

const { getSocketProvider } = require('../common/web3tool')
const { callRebalanceTrigger } = require('./trigger')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')
const socketProvider = getSocketProvider()

const blockListener = async function (blockNumber) {
  logger.info('Block Number: ' + blockNumber)
  // Call RebalanceTrigger
  const rebalanceTriggerResult = await callRebalanceTrigger()
  logger.info('rebalanceTrigger: ' + JSON.stringify(rebalanceTriggerResult))
  sendMessageToOPSChannel(`Block Number: ${blockNumber}`)
}

const start = function () {
  socketProvider.on('block', blockListener).on('error', function (err) {
    logger.error(err)
  })
  logger.info('Start linsten new blocks.')
}

const stop = function () {
  socketProvider.off('block', blockListener)
  logger.info('Stop linsten new blocks.')
}

module.exports = {
  start,
  stop,
}
