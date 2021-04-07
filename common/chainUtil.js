'use strict';

const { ethers } = require('ethers');
const { NonceManager } = require('@ethersproject/experimental');
const { SettingError, BlockChainCallError } = require('./customErrors');
const { pendingTransactions } = require('./storage');
const {
    sendMessageToLogChannel,
    sendMessageToProtocolEventChannel,
    MESSAGE_TYPES,
} = require('./discord/discordService');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);
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

if (!config.has('blockchain.network')) {
    const err = new SettingError('Config: blockchain.network not setted.');
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
        throw err;
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
            throw new BlockChainCallError(
                'Get bot nonce from chain failed.',
                MESSAGE_TYPES.adjustNonce
            );
        });
    // Get local nonce
    const transactionCountInLocal = await nonceManager
        .getTransactionCount('pending')
        .catch((error) => {
            throw new BlockChainCallError(
                'Get bot nonce from local failed.',
                MESSAGE_TYPES.adjustNonce
            );
        });
    // Adjust local nonce
    if (transactionCountInChain > transactionCountInLocal) {
        const result = await nonceManager
            .setTransactionCount(transactionCountInChain)
            .wait()
            .catch((error) => {
                logger.error(error);
                throw new BlockChainCallError(
                    `Set bot Nonce to ${transactionCountInChain} failed.`,
                    MESSAGE_TYPES.adjustNonce
                );
            });
        sendMessageToLogChannel({
            message: `Set bot Nonce to ${transactionCountInChain}`,
            type: MESSAGE_TYPES.adjustNonce,
        });
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
                throw new BlockChainCallError(
                    `Get receipt of ${hash} from chain failed.`,
                    MESSAGE_TYPES[msgLabel],
                    hash
                );
            });
        // remove type from pending transactions
        pendingTransactions.delete(type);
        const msgObj = {
            type: msgLabel,
            timestamp: transactionInfo.createdTime,
            message: `${type} transaction ${hash} has mined to chain.`,
            transactionHash: hash,
        };
        if (!transactionReceipt.status) {
            msgObj.result = `${type} transaction ${hash} reverted.`;
        }
        sendMessageToProtocolEventChannel(msgObj);
    }
};

module.exports = {
    getDefaultProvider,
    getNonceManager,
    getRpcProvider,
    syncNounce,
    checkPendingTransactions,
};
