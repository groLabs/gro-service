'use strict'

const { ethers } = require('ethers')
const { getRpcProvider, createWallet } = require('../common/web3tool')
const { SettingError } = require('../common/customErrors')
const logger = require('../common/logger')
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
  callRebalanceTrigger,
}
