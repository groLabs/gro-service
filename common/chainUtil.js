const config = require('config');
const { ethers } = require('ethers');
const { NonceManager } = require('@ethersproject/experimental');
const { SettingError, BlockChainCallError } = require('./error');
const { pendingTransactions } = require('./storage');
const {
    sendMessageToLogChannel,
    sendMessageToProtocolEventChannel,
    MESSAGE_TYPES,
} = require('./discord/discordService');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

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

let defaultProvider;
let socketProvider;
let rpcProvider;
let nonceManager;
let botWallet;

const network = config.get('blockchain.network');
logger.info(`network: ${network}`);
const botPrivateKey = process.env.BOT_PRIVATE_KEY;

function getSocketProvider() {
    if (socketProvider) {
        return socketProvider;
    }
    if (!config.has('blockchain.alchemy.api_key')) {
        const err = new SettingError(
            'Config:blockchain.alchemy.api_key not setted.'
        );
        logger.error(err);
        throw err;
    }
    logger.info('Create new socket provider.');
    const apiKey = config.get('blockchain.alchemy.api_key');
    socketProvider = new ethers.providers.AlchemyWebSocketProvider(
        network,
        apiKey
    );
    return socketProvider;
}

function getRpcProvider() {
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
}

function getDefaultProvider() {
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
}

function getBotWallet() {
    if (botWallet) return botWallet;
    const provider = getDefaultProvider();
    botWallet = new ethers.Wallet(botPrivateKey, provider);
    return botWallet;
}

function getNonceManager() {
    if (nonceManager) {
        return nonceManager;
    }
    const wallet = getBotWallet();
    nonceManager = new NonceManager(wallet);
    return nonceManager;
}

async function syncNounce() {
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
            logger.error(error);
            throw new BlockChainCallError(
                'Get bot nonce from local failed.',
                MESSAGE_TYPES.adjustNonce
            );
        });
    // Adjust local nonce
    if (transactionCountInChain > transactionCountInLocal) {
        await nonceManager
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
}

async function getReceipt(type) {
    const transactionInfo = pendingTransactions.get(type);
    const { label: msgLabel, hash } = transactionInfo;
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
    const msgObj = {
        type: msgLabel,
        timestamp: transactionInfo.createdTime,
        message: `${type} transaction ${hash} has mined to chain.`,
        transactionHash: hash,
    };
    if (!transactionReceipt) {
        msgObj.message = `${type} transaction: ${hash} is still pending.`;
        logger.info(msgObj.message);
        sendMessageToProtocolEventChannel(msgObj);
    } else {
        // remove type from pending transactions
        pendingTransactions.delete(type);

        if (!transactionReceipt.status) {
            msgObj.message = `${type} transaction ${hash} reverted.`;
        }
        sendMessageToProtocolEventChannel(msgObj);
    }
}

async function checkPendingTransactions(types) {
    logger.info(`pendingTransactions.size: ${pendingTransactions.size}`);
    if (!pendingTransactions.size) return;
    types = types || pendingTransactions.keys();
    const pendingCheckPromise = [];
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        logger.info(`pending keys: ${type}`);
        const transactionInfo = pendingTransactions.get(type);
        if (transactionInfo) {
            pendingCheckPromise.push(getReceipt(type));
        }
    }
    await Promise.all(pendingCheckPromise).catch((error) => {
        logger.error(error);
        throw error;
    });
}

module.exports = {
    getDefaultProvider,
    getNonceManager,
    getSocketProvider,
    getRpcProvider,
    syncNounce,
    checkPendingTransactions,
};
