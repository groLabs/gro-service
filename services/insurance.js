'use strict'

const { ethers } = require('ethers')
const { getRpcProvider, createWallet } = require('../common/web3tool')
const { SettingError, ContractCallError } = require('../common/customErrors')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')
const config = require('config')

if (!config.has('abi.insurance')) {
  const err = new SettingError('Config:abi.insurance not setted.')
  logger.error(err)
  throw err
}

const insuranceABI = require('../abis/IInsurance.json').abi
const provider = getRpcProvider()
const wallet = createWallet(provider)
const insuranceAddress = config.get('abi.insurance')
const insurance = new ethers.Contract(insuranceAddress, insuranceABI, wallet)

const investTrigger = async function () {
  const result = await insurance.investTrigger().catch((err) => {
    logger.error(err)
    return []
  })
  return result
}

const invest = async function (investParams) {
  const investResult = await insurance.invest(investParams).catch((err) => {
    logger.error(err)
    sendMessageToOPSChannel(
      `Call invest with params: ${JSON.stringify(investParams)} failed.`,
    )
    return {}
  })
  return investResult
}

const callRebalanceTrigger = async function () {
  const result = await insurance.rebalanceTrigger()
  return {
    swapInAmounts: result.swapInAmounts,
    swapOutPercent: result.swapOutPercent,
    utilisationRatio: result.utilisationRatio,
    lgNeedRebalance: result.lgNeedRebalance,
  }
}

module.exports = {
  investTrigger,
  invest,
  callRebalanceTrigger,
}
