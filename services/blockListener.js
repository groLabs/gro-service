'use strict'

const {
  getSocketProvider,
  getRpcProvider,
  createWallet,
} = require('../common/web3tool')
const {
  investTrigger,
  invest,
  rebalanceTrigger,
  rebalance,
} = require('./insurance')
const { getVaults, getInsurance } = require('./controller')
const {
  strategiesLength,
  strategyHarvestTrigger,
  strategyHarvest,
} = require('./vault')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')
const socketProvider = getSocketProvider()
const rpcProvider = getRpcProvider()
const pendingTransactions = new Map()

const handleInvest = async function (blockNumber) {
  if (pendingTransactions.get('invest')) {
    logger.info('Already has Invest transaction.')
    return
  }

  const insuranceAddress = await getInsurance()
  if (!insuranceAddress) {
    logger.info(`Not fund insurance address.`)
    return
  }

  const investParams = await investTrigger(insuranceAddress)
  logger.info(`${blockNumber}: investParams = ${JSON.stringify(investParams)}`)

  if (investParams.length == 0) {
    return
  }

  const investResponse = await invest(insuranceAddress, investParams)

  if (!investResponse.hash) {
    logger.info(`investResponse : ${JSON.stringify(investResponse)}`)
    return
  }

  pendingTransactions.set('invest', {
    blockNumber,
    reSendTimes: 0,
    hash: investResponse.hash,
    createdTime: Date.now(),
    transactionRequest: {
      nonce: investResponse.nonce,
      gasPrice: investResponse.gasPrice.hex,
      gasLimit: investResponse.gasLimit.hex,
      to: investResponse.to,
      value: investResponse.value.hex,
      data: investResponse.data,
      chainId: investResponse.chainId,
      from: investResponse.from,
    },
  })
}

const handleRebalance = async function (blockNumber) {
  if (pendingTransactions.get('rebalance')) {
    return
  }

  const insuranceAddress = await getInsurance()

  if (!insuranceAddress) {
    logger.info(`Not fund insurance address.`)
    return
  }

  const rebalanceParams = await rebalanceTrigger(insuranceAddress)
  logger.info(
    `${blockNumber}: rebalanceParams = ${JSON.stringify(rebalanceParams)}`,
  )

  if (rebalanceParams.utilisationRatio == 0) {
    return
  }

  const rebalanceResponse = await rebalance(insuranceAddress, [
    rebalanceParams[0],
    rebalanceParams[1],
    rebalanceParams[2],
  ])
  if (!rebalanceResponse.hash) return

  pendingTransactions.set('rebalance', {
    blockNumber,
    reSendTimes: 0,
    hash: rebalanceResponse.hash,
    createdTime: Date.now(),
    transactionRequest: {
      nonce: rebalanceResponse.nonce,
      gasPrice: rebalanceResponse.gasPrice.hex,
      gasLimit: rebalanceResponse.gasLimit.hex,
      to: rebalanceResponse.to,
      value: rebalanceResponse.value.hex,
      data: rebalanceResponse.data,
      chainId: rebalanceResponse.chainId,
      from: rebalanceResponse.from,
    },
  })
}

const strategyHarvestCheck = async function (vault, strategyIndex) {
  const key = `harvest-${vault}-${strategyIndex}`
  if (pendingTransactions.get(key)) return false
  const triggerResponse = await strategyHarvestTrigger(vault, strategyIndex)
  logger.info(`${key} harvest trigger returns: ${triggerResponse}`)
  if (!triggerResponse) {
    logger.info(
      `vault: ${vault} - strategy: ${strategyIndex} doesn't need harvest.`,
    )
    return false
  }
  return true
}

const harvestStrategy = async function (
  vault,
  strategyIndex,
  nonce,
  blockNumber,
) {
  logger.info(
    `vault: ${vault} strategyIndex: ${strategyIndex} startNonce: ${nonce}`,
  )
  const key = `harvest-${vault}-${strategyIndex}`
  const harvestResult = await strategyHarvest(vault, strategyIndex, nonce)
  if (!harvestResult) return

  pendingTransactions.set(key, {
    blockNumber,
    reSendTimes: 0,
    hash: harvestResult.hash,
    createdTime: Date.now(),
    transactionRequest: {
      nonce: harvestResult.nonce,
      gasPrice: harvestResult.gasPrice.hex,
      gasLimit: harvestResult.gasLimit.hex,
      to: harvestResult.to,
      value: harvestResult.value.hex,
      data: harvestResult.data,
      chainId: harvestResult.chainId,
      from: harvestResult.from,
    },
  })
}

const harvestVault = async function (
  vault,
  needHarvestStrategyIndexes,
  startNonce,
  blockNumber,
) {
  logger.info(`vault: ${vault} startNonce: ${startNonce}`)
  let strategyHarvestPromises = []
  for (let i = 0; i < needHarvestStrategyIndexes.length; i++) {
    strategyHarvestPromises.push(
      harvestStrategy(
        vault,
        needHarvestStrategyIndexes[i],
        startNonce++,
        blockNumber,
      ),
    )
  }

  await Promise.all(strategyHarvestPromises).catch((error) => {
    logger.error(error)
  })
}

const handleHarvest = async function (blockNumber) {
  const vaults = await getVaults()
  if (vaults == 0) {
    logger.info('Not fund any vault.')
    return
  }
  const provider = getRpcProvider()
  const wallet = createWallet(provider)
  let startNonce = await wallet
    .getTransactionCount('pending')
    .catch((error) => {
      logger.error(error)
      return -1
    })
  if (startNonce == -1) {
    logger.error('Get bot nonce failed.')
    return
  }
  logger.info(`Harvest start nonce: ${startNonce}`)
  const vaultHarvestPromises = []
  for (let i = 0; i < vaults.length; i++) {
    logger.info(`vault: ${i} : ${vaults[i]}`)
    const strategyLength = await strategiesLength(vaults[i])
    if (strategyLength == 0) {
      logger.info(`vault: ${vaults[i]} doesn't have any strategy.`)
      continue
    }

    // handle these strategy that need harvest
    let needHarvestStrategyIndexes = []
    for (let i = 0; i < strategyLength; i++) {
      const harvestFlag = await strategyHarvestCheck(vaults[i], i)
      if (harvestFlag) needHarvestStrategyIndexes.push(i)
    }
    logger.info(
      `vault: ${
        vaults[i]
      } [strategies: ${strategyLength.toString()}; harvestStrategies: ${
        needHarvestStrategyIndexes.length
      }]`,
    )
    if (needHarvestStrategyIndexes.length == 0) {
      continue
    }

    vaultHarvestPromises.push(
      harvestVault(
        vaults[i],
        needHarvestStrategyIndexes,
        startNonce,
        blockNumber,
      ),
    )
    startNonce = startNonce + needHarvestStrategyIndexes.length
  }
  await Promise.all(vaultHarvestPromises).catch((error) => {
    logger.error(error)
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
  // Rebalance check
  // await handleRebalance(blockNumber)
  // Harvest check
  // await handleHarvest(blockNumber)
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
