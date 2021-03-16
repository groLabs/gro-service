'use strict'

const { ethers } = require('ethers')
const { getRpcProvider, createWallet } = require('../common/web3tool')
const { SettingError, ContractCallError } = require('../common/customErrors')
const logger = require('../common/logger')
const { sendMessageToOPSChannel } = require('./discordServie')
const config = require('config')

if (!config.has('abi.controller')) {
  const err = new SettingError('Config:abi.controller not setted.')
  logger.error(err)
  throw err
}

const controllerABI = require('../abis/IController.json').abi
const provider = getRpcProvider()
const wallet = createWallet(provider)
const controllerAddress = config.get('abi.controller')
const controller = new ethers.Contract(controllerAddress, controllerABI, wallet)

const getInsurance = async function () {
  const insurance = await controller.insurance().catch((error) => {
    logger.error(error)
    return null
  })
  return insurance
}

const getVaults = async function () {
  const vaults = await controller.vaults().catch((error) => {
    logger.error(error)
    return []
  })
  return vaults
}

module.exports = {
  getInsurance,
  getVaults,
}
