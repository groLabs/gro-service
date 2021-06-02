const config = require('config');
const { ethers } = require('ethers');
const fs = require('fs');
const { BigNumber } = require('ethers');
const { NonceManager } = require('@ethersproject/experimental');
const { SettingError, BlockChainCallError } = require('./error');
const { shortAccount } = require('./digitalUtil');
const {
    sendMessageToChannel,
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
} = require('./discord/discordService');
const { botBalanceMessage } = require('../discordMessage/botBalanceMessage');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

if (!config.has('blockchain.network')) {
    const err = new SettingError('Config:blockchain.network not set.');
    logger.error(err);
    throw err;
}

if (
    !process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`] &&
    process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`] === 'NO_PASSWORD'
) {
    const err = new SettingError(
        `Environment variable ${`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`} are not set.`
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
const botPrivateKey = process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`];
// logger.info(`bot private key : ${botPrivateKey}`);

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
    defaultProvider = ethers.providers.getDefaultProvider(network, options);
    return defaultProvider;
}

function getBotWallet() {
    if (botWallet) return botWallet;
    try {
        const provider = getRpcProvider();
        const keystorePassword = config.get('blockchain.keystore_password');

        if (keystorePassword === 'NO_PASSWORD') {
            botWallet = new ethers.Wallet(botPrivateKey, provider);
        } else {
            const data = fs.readFileSync(config.get('blockchain.keystore'), {
                flag: 'a+',
            });
            botWallet = ethers.Wallet.fromEncryptedJsonSync(
                data,
                keystorePassword
            );
        }
        logger.info(`wallet address ${botWallet.address}`);
        return botWallet.connect(provider);
    } catch (e) {
        logger.error(e);
        throw new SettingError('Init wallet failed.');
    }
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
        nonceManager.setTransactionCount(transactionCountInChain);
        sendMessageToChannel(DISCORD_CHANNELS.botLogs, {
            message: `Set bot Nonce to ${transactionCountInChain}`,
            type: MESSAGE_TYPES.adjustNonce,
        });
    }
}

async function checkAccountBalance(botBalanceWarnVault) {
    const botAccount = getNonceManager().signer.address;
    const botType = `${process.env.BOT_ENV.toLowerCase()}Bot`;
    const accountLabel = shortAccount(botAccount);
    const balance = await getNonceManager()
        .getBalance()
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                `Get ETH balance of bot:${botAccount} failed.`,
                MESSAGE_TYPES[botType],
                {
                    embedMessage: {
                        type: MESSAGE_TYPES[botType],
                        description: `**${botType}** get ${accountLabel}'s ETH balance failed`,
                        urls: [
                            {
                                label: accountLabel,
                                type: 'account',
                                value: botAccount,
                            },
                        ],
                    },
                }
            );
        });
    if (balance.lt(BigNumber.from(botBalanceWarnVault))) {
        botBalanceMessage({
            botAccount,
            botType,
            balance,
        });
    }
}

async function getCurrentBlockNumber() {
    const block = await getDefaultProvider()
        .getBlockNumber()
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                'Get current block number from chain failed.'
            );
        });
    return block;
}

async function getTimestampByBlockNumber(blockNumber) {
    const block = await getRpcProvider()
        .getBlock(blockNumber)
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                `Get block by number ${blockNumber} failed`
            );
        });
    return block.timestamp.toString();
}

module.exports = {
    getDefaultProvider,
    getNonceManager,
    getSocketProvider,
    getRpcProvider,
    syncNounce,
    checkAccountBalance,
    getCurrentBlockNumber,
    getTimestampByBlockNumber,
};
