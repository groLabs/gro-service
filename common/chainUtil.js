'use strict';

const { ethers } = require('ethers');
const { NonceManager } = require('@ethersproject/experimental');
const { SettingError } = require('./customErrors');
const { pendingTransactions } = require('./storage');
const {
    sendMessage,
    DISCORD_CHANNELS,
    MESSAGE_TYPES,
} = require('./discord/discordService');
const logger = require('./logger');
const config = require('config');

if (!config.has('blockchain.network')) {
    const err = new SettingError('Config:blockchain.network not set.');
    logger.error(err);
    throw err;
}

if (!process.env.BOT_PRIVATE_KEY) {
    const err = new SettingError(
        'Environment variable BOT_PRIVATE_KEY are not set.'
    );
    logger.error(err);
    throw err;
}

let defaultProvider = undefined;
let socketProvider = undefined;
let rpcProvider = undefined;
let nonceManager = undefined;
let botWallet = undefined;

const network = config.get('blockchain.network');
logger.info('network: ' + network);
const botPrivateKey = process.env.BOT_PRIVATE_KEY;

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

const getRpcProvider = function () {
    if (rpcProvider) {
        return rpcProvider;
    }
    if (!config.has('blockchain.api_keys.alchemy')) {
        const err = new SettingError(
            'Config:blockchain.api_keys.alchemy not setted.'
        );
        logger.error(err);
        return;
    }
    logger.info('Create a new Rpc provider.');
    const apiKey = config.get('blockchain.api_keys.alchemy');
    rpcProvider = new ethers.providers.AlchemyProvider(network, apiKey);
    return rpcProvider;
};

const getDefaultProvider = function () {
    if (defaultProvider) {
        return defaultProvider;
    }
    logger.info('Create new default provider.');
    let options = {};
    if (config.has('blockchain.api_keys')) {
        options = config.get('blockchain.api_keys');
    }
    logger.info('Create a new default provider.');
    defaultProvider = new ethers.providers.getDefaultProvider(network, options);
    return defaultProvider;
};

const getBotWallet = function () {
    if (botWallet) return botWallet;
    const provider = getDefaultProvider();
    botWallet = new ethers.Wallet(botPrivateKey, provider);
    return botWallet;
};

const getNonceManager = function () {
    if (nonceManager) {
        return nonceManager;
    }
    const wallet = getBotWallet();
    nonceManager = new NonceManager(wallet);
    return nonceManager;
};

const syncNounce = async function () {
    // Get nonce from chain
    const transactionCountInChain = await nonceManager
        .getTransactionCount()
        .catch((error) => {
            logger.error(error);
            return -1;
        });
    if (transactionCountInChain == -1) {
        logger.error('Get transactionCountInChain failed.');
        return;
    }
    // Get local nonce
    const transactionCountInLocal = await nonceManager
        .getTransactionCount('pending')
        .catch((error) => {
            logger.error(error);
            return -1;
        });
    if (transactionCountInLocal == -1) {
        logger.error('Get transactionCountInLocal failed.');
        return;
    }
    // Adjust local nonce
    if (transactionCountInChain > transactionCountInLocal) {
        const result = await nonceManager
            .setTransactionCount(transactionCountInChain)
            .wait()
            .catch((error) => {
                logger.error(error);
                sendMessage(DISCORD_CHANNELS.botAlerts, {
                    result: 'Failed',
                    type: MESSAGE_TYPES.adjustNonce,
                    timestamp: new Date(),
                });
                return {};
            });
        if (result.transactionHash) {
            sendMessage(DISCORD_CHANNELS.botLogs, {
                result: 'Success',
                type: MESSAGE_TYPES.adjustNonce,
                timestamp: new Date(),
            });
        }
    }
};

const checkPendingTransactions = async function () {
    logger.info(`pendingTransactions.size: ${pendingTransactions.size}`);
    if (!pendingTransactions.size) return;
    for (let type of pendingTransactions.keys()) {
        const transactionInfo = pendingTransactions.get(type);
        const msgLabel = transactionInfo.label;
        const hash = transactionInfo.hash;
        const transactionReceipt = await defaultProvider
            .getTransactionReceipt(hash)
            .catch((err) => {
                logger.error(err);
                sendMessage(DISCORD_CHANNELS.botAlerts, {
                    type: MESSAGE_TYPES[msgLabel],
                    timestamp: transactionInfo.createdTime,
                    result: `Failed: getTransactionReceipt for ${hash}`,
                    transactionHash: hash,
                });
                return null;
            });
        if (!transactionReceipt) return;
        // remove type from pending transactions
        pendingTransactions.delete(type);
        sendMessage(DISCORD_CHANNELS.protocolEvents, {
            type: MESSAGE_TYPES[msgLabel],
            timestamp: transactionInfo.createdTime,
            result: `${type} mined. Status: ${transactionReceipt.status}`,
            transactionHash: hash,
        });
    }
};

module.exports = {
    getDefaultProvider,
    getNonceManager,
    getRpcProvider,
    syncNounce,
    checkPendingTransactions,
};
