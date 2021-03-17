'use strict'

const { getVaults } = require('../contract/controller')
const {
  strategiesLength,
  strategyHarvestTrigger,
  strategyHarvest,
} = require('../contract/vault')
const { pendingTransactions } = require('../../common/storage')
const logger = require('../../common/logger')

const harvestStrategy = async function (vault, strategyIndex, blockNumber) {
  const key = `harvest-${vault}-${strategyIndex}`

  if (pendingTransactions.get(key)) {
    logger.info(`Already has pending ${key} transaction.`)
    return
  }

  const triggerResponse = await strategyHarvestTrigger(vault, strategyIndex)
  logger.info(`${key} harvest trigger returns: ${triggerResponse}`)
  if (!triggerResponse) {
    logger.info(
      `vault: ${vault} - strategy: ${strategyIndex} doesn't need harvest.`,
    )
    return
  }

  const harvestResult = await strategyHarvest(vault, strategyIndex)
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

const harvestVault = async function (vault, blockNumber) {
  const strategyLength = await strategiesLength(vault)
  if (strategyLength == 0) {
    logger.info(`vault: ${vault} doesn't have any strategy.`)
    return
  }
  for (let i = 0; i < strategyLength; i++) {
    await harvestStrategy(vault, i, blockNumber)
  }
}

const handleHarvest = async function (blockNumber) {
  const vaults = await getVaults()
  if (vaults == 0) {
    logger.info('Not fund any vault.')
    return
  }

  for (let i = 0; i < vaults.length; i++) {
    logger.info(`vault: ${i} : ${vaults[i]}`)
    await harvestVault(vaults[i], blockNumber)
  }
}

module.exports = {
  handleHarvest,
}
