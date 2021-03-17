'use strict'

const { getSocketProvider, getNonceManager } = require('../common/web3tool')
const { sendMessageToOPSChannel } = require('./discordServie')
const { pendingTransactions } = require('../common/storage')
const { handleInvest } = require('./trigger/investTrigger')
const { handleHarvest } = require('./trigger/harvestTrigger')
const logger = require('../common/logger')
const HandleBlockService = require('./handleBlockService')
const socketProvider = getSocketProvider()
const nonceManager = getNonceManager()

const checkPendingTransactions = async function () {
  const transactionTypes = pendingTransactions.keys()
  if (transactionTypes == 0) return

  Array.from(transactionTypes).forEach(async (type) => {
    const transactionInfo = pendingTransactions.get(type)
    const hash = transactionInfo.hash
    const transactionReceipt = await socketProvider
      .getTransactionReceipt(hash)
      .catch((err) => {
        logger.error(err)
        sendMessageToOPSChannel(`${type} ${hash} getTransactionReceipt error.`)
        return null
      })
    if (!transactionReceipt) return

    // remove type from pending transactions
    pendingTransactions.delete(type)

    if (transactionReceipt.status == 1) {
      sendMessageToOPSChannel(`${type} ${hash} successfully.`)
      logger.info(`${type} ${hash} mined.`)
    } else {
      sendMessageToOPSChannel(`${type} ${hash} reverted.`)
      logger.info(`${type} ${hash} reverted.`)
    }
  })
}

const blockListener = async function (blockNumber) {
  logger.info('Block Number: ' + blockNumber)

  // Check Pending transactions
  await checkPendingTransactions()

  // Get nonce from chain
  const transactionCountInChain = await nonceManager
    .getTransactionCount()
    .catch((error) => {
      logger.error(error)
      return -1
    })
  if (transactionCountInChain == -1) {
    logger.error('Get transactionCountInChain failed.')
    return
  }
  // Get local nonce
  const transactionCountInLocal = await nonceManager
    .getTransactionCount('pending')
    .catch((error) => {
      logger.error(error)
      return -1
    })
  if (transactionCountInLocal == -1) {
    logger.error('Get transactionCountInLocal failed.')
    return
  }
  // Adjust local nonce
  if (transactionCountInChain > transactionCountInLocal) {
    nonceManager.setTransactionCount(transactionCountInChain)
    logger.info(`Adjust local nonce to ${transactionCountInChain}.`)
  }

  // Invest check
  await handleInvest(blockNumber)
  // Harvest check
  await handleHarvest(blockNumber)
}

const handleBlockService = new HandleBlockService(blockListener)

const handleBlock = function (blockNumber) {
  handleBlockService.handleNewBlock(blockNumber)
}

const start = function () {
  socketProvider.on('block', handleBlock).on('error', function (err) {
    logger.error(err)
  })
  logger.info('Start linsten new blocks.')
}

const stop = function () {
  socketProvider.off('block')
  logger.info('Stop linsten new blocks.')
}

const getPendingBlocks = function () {
  return handleBlockService.getBlockQueues()
}

module.exports = {
  start,
  stop,
  getPendingBlocks,
}
