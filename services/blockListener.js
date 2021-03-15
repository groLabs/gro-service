'use strict'

const { getSocketProvider, getRpcProvider } = require('../common/web3tool')
const { investTrigger, invest } = require('./insurance')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')
const socketProvider = getSocketProvider()
const rpcProvider = getRpcProvider()
const pendingTransactions = new Map()

const handleInvest = async function (blockNumber) {
  if (pendingTransactions.get('invest')) {
    return
  }

  const investParams = await investTrigger()
  logger.info(`${blockNumber}: investParams = ${JSON.stringify(investParams)}`)

  if (investParams.length == 0) {
    return
  }

  const investResponse = await invest(investParams)
  if (!investResponse.hash) return
  pendingTransactions.set('invest', {
    blockNumber,
    reSendTimes: 0,
    hash: investResponse.hash,
    createdTime: Date.now(),
    transactionRequest: {
      nonce: investResponse.nonce,
      gasPrice: investResponse.gasPrice.hex,
      gasLimit: investResponse.gasPrice.hex,
      to: investResponse.to,
      value: investResponse.value.hex,
      data: investResponse.data,
      chainId: investResponse.chainId,
      from: investResponse.from,
    },
  })
}

const checkPendingTransactions = async function (pendingTransactions) {
  const transactionTypes = pendingTransactions.keys()
  if (transactionTypes == 0) return

  Array.from(transactionTypes).forEach(async (type) => {
    const transactionInfo = pendingTransactions.get(type)
    const hash = transactionInfo.hash
    const transactionReceipt = await rpcProvider
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
  await checkPendingTransactions(pendingTransactions)
  // Invest check
  await handleInvest(blockNumber)
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
  pendingTransactions,
}
