'use strict'

const { invest: callInvest } = require('./contract/insurance')
const { strategyHarvest } = require('./contract/vault')
const { execPnl: callExecPnl } = require('./contract/pnl')
const { getInsurance, getPnl } = require('./contract/controller')
const { pendingTransactions } = require('../common/storage')
const logger = require('../common/logger')

const insuranceAddress = getInsurance()
  .then((address) => {
    return address
  })
  .catch((error) => {
    logger.error(error)
    return
  })

const pnlAddress = getPnl()
  .then((address) => {
    return address
  })
  .catch((error) => {
    logger.error(error)
    return
  })

const invest = async function (blockNumber, investParams) {
  const investResponse = await callInvest(insuranceAddress, investParams)

  if (!investResponse.hash) return

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

const harvest = async function (blockNumber, harvestStrategies) {
  for (let i = 0; i < harvestStrategies.length; i++) {
    const strategyInfo = harvestStrategies[i]
    const key = `harvest-${strategyInfo.vault}-${strategyInfo.strategyIndex}`
    const harvestResult = await strategyHarvest(
      strategyInfo.vault,
      strategyInfo.strategyIndex,
      strategyInfo.callCost,
    )
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
}

const execPnl = async function (blockNumber) {
  const pnlResponse = await callExecPnl(pnlAddress)

  if (!pnlResponse.hash) return

  pendingTransactions.set('pnl', {
    blockNumber,
    reSendTimes: 0,
    hash: pnlResponse.hash,
    createdTime: Date.now(),
    transactionRequest: {
      nonce: pnlResponse.nonce,
      gasPrice: pnlResponse.gasPrice.hex,
      gasLimit: pnlResponse.gasLimit.hex,
      to: pnlResponse.to,
      value: pnlResponse.value.hex,
      data: pnlResponse.data,
      chainId: pnlResponse.chainId,
      from: pnlResponse.from,
    },
  })
}

module.exports = {
  invest,
  harvest,
  execPnl,
}
