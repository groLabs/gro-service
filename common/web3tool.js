'use strict'

const { ethers } = require('ethers')
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

const createWallet = function (provider, privateKey) {
  privateKey = privateKey || botPrivateKey
  return new ethers.Wallet(privateKey, provider)
}

module.exports = {
  getSocketProvider,
  getRpcProvider,
  createWallet,
}
