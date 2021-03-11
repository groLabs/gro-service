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

const controllerABI = require('../abis/controller.json').abi
const provider = getRpcProvider()
const wallet = createWallet(provider)
const controllerAddress = config.get('abi.controller')

const controller = new ethers.Contract(controllerAddress, controllerABI, wallet)

const addToWhitelist = async function () {
  const transactionResponse = await controller
    .addToWhitelist('0x60Ab6B98CF5702Aaa062b0B0e623D85cf71c2217')
    .catch((error) => {
      logger.error(error)
      throw new ContractCallError(
        'addToWhitelist:0x60Ab6B98CF5702Aaa062b0B0e623D85cf71c2217',
      )
    })
  const receipt = await transactionResponse.wait().catch((error) => {
    logger.error(error)
    throw new ContractCallError(
      'addToWhitelist:wait:0x60Ab6B98CF5702Aaa062b0B0e623D85cf71c2217',
    )
  })
  if (receipt.status != 1) {
    logger.error(
      `transactionHash: ${receipt.transactionHash} - addToWhitelist:0x60Ab6B98CF5702Aaa062b0B0e623D85cf71c2217:revert`,
    )
    return
  }
  sendMessageToOPSChannel(
    'addToWhitelist:0x60Ab6B98CF5702Aaa062b0B0e623D85cf71c2217 done.',
  )
}

module.exports = {
  addToWhitelist,
}

addToWhitelist().then(() => {
  console.log('done')
})
