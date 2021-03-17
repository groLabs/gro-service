'use strict'

const { ethers } = require('ethers')
const { getNonceManager } = require('../../common/web3tool')
const { SettingError } = require('../../common/customErrors')
const logger = require('../../common/logger')
const config = require('config')

if (!config.has('abi.controller')) {
  const err = new SettingError('Config:abi.controller not setted.')
  logger.error(err)
  throw err
}

const controllerABI = require('../../abis/IController.json').abi
const nonceManager = getNonceManager()
const controllerAddress = config.get('abi.controller')
const controller = new ethers.Contract(
  controllerAddress,
  controllerABI,
  nonceManager,
)

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
