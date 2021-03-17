'use strict'
const { rebalanceTrigger, rebalance } = require('./insurance')
const { getInsurance } = require('./controller')
const logger = require('../common/logger')
const { pendingTransactions } = require('../../common/storage')

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

module.exports = {
  handleRebalance,
}
