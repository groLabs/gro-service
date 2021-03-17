'use strict'

const { ethers } = require('ethers')
const { NonceManager } = require('@ethersproject/experimental')
const { SettingError } = require('./customErrors')
const logger = require('./logger')
const config = require('config')

if (!config.has('blockchain.network')) {
  const err = new SettingError('Config:blockchain.network not setted.')
  logger.error(err)
  throw err
}

if (!config.has('blockchain.alchemy.api_key')) {
  const err = new SettingError('Config:blockchain.alchemy.api_key not setted.')
  logger.error(err)
  throw err
}

if (!config.has('blockchain.bot_private_key')) {
  const err = new SettingError('Config:blockchain.bot_private_key not setted.')
  logger.error(err)
  throw err
}

let socketProvider = undefined
let rpcProvider = undefined
let nonceManager = undefined
let botWallet = undefined

const network = config.get('blockchain.network')
const apiKey = config.get('blockchain.alchemy.api_key')
const botPrivateKey = config.get('blockchain.bot_private_key')

const getSocketProvider = function () {
  if (socketProvider) {
    return socketProvider
  }
  logger.info('Create new socket provider.')
  socketProvider = new ethers.providers.AlchemyWebSocketProvider(
    network,
    apiKey,
  )
  return socketProvider
}

const getRpcProvider = function () {
  if (rpcProvider) {
    return rpcProvider
  }
  logger.info('Create a new Rpc provider.')
  rpcProvider = new ethers.providers.AlchemyProvider(network, apiKey)
  return rpcProvider
}

const getBotWallet = function () {
  if (botWallet) return botWallet
  const provider = getRpcProvider()
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
  getSocketProvider,
  getRpcProvider,
  getBotWallet,
  getNonceManager,
}
