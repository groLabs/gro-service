'use strict'

const { getDefaultProvider, getNonceManager } = require('../common/web3tool')
const { sendMessageToOPSChannel } = require('./discordServie')
const { pendingTransactions } = require('../common/storage')
const { invest, harvest, execPnl } = require('./transactionService')
const {
  investTrigger,
  harvestTrigger,
  pnlTrigger,
} = require('./triggerService')
const logger = require('../common/logger')
const HandleBlockService = require('./handleBlockService')
const provider = getDefaultProvider()
const nonceManager = getNonceManager()

const checkPendingTransactions = async function () {
  const transactionTypes = pendingTransactions.keys()
  if (transactionTypes == 0) return

  Array.from(transactionTypes).forEach(async (type) => {
    const transactionInfo = pendingTransactions.get(type)
    const hash = transactionInfo.hash
    const transactionReceipt = await provider
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

const callTriggers = async function () {
  let triggerPromises = []
  triggerPromises.push(investTrigger())
  triggerPromises.push(harvestTrigger())
  // triggerPromises.push(pnlTrigger())
  const triggerResult = await Promise.all(triggerPromises).catch((error) => {
    logger.error(error)
    return []
  })
  return triggerResult
}

const sendTransaction = async function (blockNumber, triggerResult) {
  // Handle invest
  if (triggerResult[0].needCall) {
    await invest(blockNumber, triggerResult[0].params)
  }

  // Handle harvest
  if (triggerResult[1].needCall) {
    await harvest(blockNumber, triggerResult[1].params)
  }

  // Handle Pnl
  // if (triggerResult[2].needCall) {
  //   await execPnl(blockNumber)
  // }
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

  // Call trigger
  const triggerResult = await callTriggers()

  if (!triggerResult.length) return
  // Call transaction
  await sendTransaction(blockNumber, triggerResult)
}

const handleBlockService = new HandleBlockService(blockListener)

const handleBlock = function (blockNumber) {
  handleBlockService.handleNewBlock(blockNumber)
}

const start = function () {
  provider.on('block', handleBlock).on('error', function (err) {
    logger.error(err)
  })
  logger.info('Start linsten new blocks.')
}

const stop = function () {
  provider.off('block')
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
