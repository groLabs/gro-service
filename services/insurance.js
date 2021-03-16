'use strict'

const { ethers } = require('ethers')
const { getRpcProvider, createWallet } = require('../common/web3tool')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')

const insuranceABI = require('../abis/IInsurance.json').abi
const provider = getRpcProvider()
const wallet = createWallet(provider)

const investTrigger = async function (insuranceAddress) {
  const insurance = new ethers.Contract(insuranceAddress, insuranceABI, wallet)
  const result = await insurance.investTrigger().catch((err) => {
    logger.error(err)
    return []
  })
  return result
}

const invest = async function (insuranceAddress, investParams) {
  const insurance = new ethers.Contract(insuranceAddress, insuranceABI, wallet)
  const investResult = await insurance.invest(investParams).catch((err) => {
    logger.error(err)
    sendMessageToOPSChannel(
      `Call invest with params: ${JSON.stringify(investParams)} failed.`,
    )
    return {}
  })
  return investResult
}

const rebalanceTrigger = async function (insuranceAddress) {
  const insurance = new ethers.Contract(insuranceAddress, insuranceABI, wallet)
  const triggerResult = await insurance.rebalanceTrigger().catch((error) => {
    logger.error(error)
    return {}
  })
  return triggerResult
}

const rebalance = async function (insuranceAddress, rebalanceParams) {
  const insurance = new ethers.Contract(insuranceAddress, insuranceABI, wallet)
  const rebalanceResponse = await insurance
    .rebalance(...rebalanceParams)
    .catch((error) => {
      logger.error(error)
      sendMessageToOPSChannel(
        `Call rebalance with params: ${JSON.stringify(
          rebalanceParams,
        )} failed.`,
      )
      return {}
    })
  return rebalanceResponse
}

module.exports = {
  investTrigger,
  invest,
  rebalanceTrigger,
  rebalance,
}
