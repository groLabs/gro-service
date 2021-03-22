'use strict'

const { ethers } = require('ethers')
const { NonceManager } = require('@ethersproject/experimental')
const { SettingError } = require('./customErrors')
const logger = require('./logger')
const config = require('config')

if (!config.has('blockchain.network')) {
  const err = new SettingError('Config:blockchain.network not set.')
  logger.error(err)
  throw err
}

if (!config.has('blockchain.bot_private_key')) {
  const err = new SettingError('Config:blockchain.bot_private_key not set.')
  logger.error(err)
  throw err
}

let defaultProvider = undefined
let socketProvider = undefined
let rpcProvider = undefined
let nonceManager = undefined
let botWallet = undefined

const network = config.get('blockchain.network')
logger.info('network: ' + network)
const botPrivateKey = config.get('blockchain.bot_private_key')

// const getSocketProvider = function () {
//   if (socketProvider) {
//     return socketProvider
//   }
//   if (!config.has('blockchain.alchemy.api_key')) {
//     const err = new SettingError(
//       'Config:blockchain.alchemy.api_key not setted.',
//     )
//     logger.error(err)
//     return
//   }
//   logger.info('Create new socket provider.')
//   const apiKey = config.get('blockchain.alchemy.api_key')
//   socketProvider = new ethers.providers.AlchemyWebSocketProvider(
//     network,
//     apiKey,
//   )
//   return socketProvider
// }

// const getRpcProvider = function () {
//   if (rpcProvider) {
//     return rpcProvider
//   }
//   if (!config.has('blockchain.alchemy.api_key')) {
//     const err = new SettingError(
//       'Config:blockchain.alchemy.api_key not setted.',
//     )
//     logger.error(err)
//     return
//   }
//   logger.info('Create a new Rpc provider.')
//   const apiKey = config.get('blockchain.alchemy.api_key')
//   rpcProvider = new ethers.providers.AlchemyProvider(network, apiKey)
//   return rpcProvider
// }

const getDefaultProvider = function () {
  if (defaultProvider) {
    return defaultProvider
  }
  logger.info('Create new default provider.')
  let options = {}
  if (config.has('blockchain.api_keys')) {
    options = config.get('blockchain.api_keys')
  }
  logger.info('Create a new default provider.')
  defaultProvider = new ethers.providers.getDefaultProvider(network, options)
  return defaultProvider
}

const getBotWallet = function () {
  if (botWallet) return botWallet
  const provider = getDefaultProvider()
  botWallet = new ethers.Wallet(botPrivateKey, provider)
  return botWallet
}

const getNonceManager = function () {
  if (nonceManager) {
    return nonceManager
  }
  const wallet = getBotWallet()
  nonceManager = new NonceManager(wallet)
  return nonceManager
}

module.exports = {
  getDefaultProvider,
  getNonceManager,
}
