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
const { getConfig } = require('./configUtil');

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
const rpcProviders = {};
const botWallets = {};

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

function getAlchemyRpcProvider(apiKey) {
    let result = rpcProviders[apiKey];
    if (!result) {
        const key = `blockchain.alchemy_api_keys.${apiKey}`;
        const apiKeyValue = getConfig(key);
        if (process.env.NODE_ENV === 'develop') {
            const options = getConfig('blockchain.api_keys');
            result = ethers.providers.getDefaultProvider(network, options);
        } else {
            result = new ethers.providers.AlchemyProvider(network, apiKeyValue);
        }

        logger.info(`Create a new ${apiKey} Rpc provider.`);
        rpcProviders[apiKey] = result;
    }
    return result;
}

function getBotWallet() {
    if (botWallet) return botWallet;
    try {
        let provider;
        if (process.env.NODE_ENV === 'develop') {
            provider = getDefaultProvider();
        } else {
            provider = getRpcProvider();
        }
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

function createWallet(providerKey, botType, walletKey) {
    if (!walletKey) walletKey = 'default';
    let wallet;
    const provider = getAlchemyRpcProvider(providerKey);
    const keystorePassword = getConfig(
        `blockchain.keystores.${botType}.${walletKey}_password`
    );
    if (keystorePassword === 'NO_PASSWORD') {
        const privateKey = getConfig(
            `blockchain.keystores.${botType}.${walletKey}_private_key`
        );
        wallet = new ethers.Wallet(privateKey, provider);
    } else {
        const keystore = getConfig(
            `blockchain.keystores.${botType}.${walletKey}_file_path`
        );
        const data = fs.readFileSync(keystore, {
            flag: 'a+',
        });
        wallet = ethers.Wallet.fromEncryptedJsonSync(data, keystorePassword);
        wallet.connect(provider);
    }
    logger.info(
        `create new wallet address ${wallet.address}, and connect to ${providerKey} provider`
    );
    return wallet;
}

function getWalletNonceManager(providerKey, accountKey) {
    let walletNonceManager;
    if (!botWallets[providerKey]) {
        botWallets[providerKey] = {};
    }
    const providerAccounts = botWallets[providerKey];
    walletNonceManager = providerAccounts[accountKey];
    if (!walletNonceManager) {
        const wallet = createWallet(providerKey, accountKey);
        walletNonceManager = new NonceManager(wallet);
        providerAccounts[accountKey] = walletNonceManager;
    }
    return walletNonceManager;
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

async function getTimestampByBlockNumber(blockNumber, providerOrSigner) {
    const provider = providerOrSigner || getRpcProvider();
    const block = await provider.getBlock(blockNumber).catch((error) => {
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
    getAlchemyRpcProvider,
    getWalletNonceManager,
    syncNounce,
    checkAccountBalance,
    getCurrentBlockNumber,
    getTimestampByBlockNumber,
};
