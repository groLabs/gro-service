'use strict'

const { investTrigger, invest } = require('../contract/insurance')
const { getInsurance } = require('../contract/controller')
const { pendingTransactions } = require('../../common/storage')
const { ContractCallError } = require('../../common/customErrors')
const logger = require('../../common/logger')

const handleInvest = async function (blockNumber) {
  if (pendingTransactions.get('invest')) {
    logger.info('Already has pending invest transaction.')
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

module.exports = {
  handleInvest,
}
