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

const DEFAULT_PROVIDER_KEY = 'default';
const DEFAULT_WALLET_KEY = 'default';

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

let defaultProvider;
let socketProvider;
let rpcProvider;
let defaultWalletManager;
const rpcProviders = {};
const botWallets = {};

const network = getConfig('blockchain.network');
logger.info(`network: ${network}`);

function getSocketProvider() {
    if (socketProvider) {
        return socketProvider;
    }
    logger.info('Create new socket provider.');
    const apiKey = getConfig('blockchain.alchemy_api_keys.default');
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
    logger.info('Create default Rpc provider.');
    const apiKey = getConfig('blockchain.alchemy_api_keys.default');
    rpcProvider = new ethers.providers.AlchemyProvider(network, apiKey);
    return rpcProvider;
}

function getDefaultProvider() {
    if (defaultProvider) {
        return defaultProvider;
    }
    const options = getConfig('blockchain.default_api_keys', false) || {};
    logger.info('Create a new default provider.');
    if (process.env.NODE_ENV === 'develop') {
        defaultProvider = ethers.providers.getDefaultProvider(network);
    } else {
        defaultProvider = ethers.providers.getDefaultProvider(network, options);
    }
    defaultProvider = ethers.providers.getDefaultProvider(network, options);
    return defaultProvider;
}

function getAlchemyRpcProvider(providerKey) {
    // only for test
    const providerKeys = Object.keys(rpcProviders);
    logger.info(`providerKeys: ${JSON.stringify(providerKeys)}`);
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    if (providerKey === DEFAULT_PROVIDER_KEY) {
        if (process.env.NODE_ENV === 'develop') {
            result = getDefaultProvider();
        } else {
            result = getRpcProvider();
        }
    } else {
        result = rpcProviders[providerKey];
        if (!result) {
            const key = `blockchain.alchemy_api_keys.${providerKey}`;
            const apiKeyValue = getConfig(key);
            if (process.env.NODE_ENV === 'develop') {
                result = ethers.providers.getDefaultProvider(network);
            } else {
                result = new ethers.providers.AlchemyProvider(
                    network,
                    apiKeyValue
                );
            }

            logger.info(`Create a new ${providerKey} Rpc provider.`);
            rpcProviders[providerKey] = result;
        }
    }
    return result;
}

function getNonceManager() {
    if (defaultWalletManager) {
        return defaultWalletManager;
    }

    const provider = getAlchemyRpcProvider(DEFAULT_PROVIDER_KEY);
    const keystorePassword = getConfig('blockchain.keystores.default.password');
    let botWallet;
    if (keystorePassword === 'NO_PASSWORD') {
        botWallet = new ethers.Wallet(
            getConfig('blockchain.keystores.default.private_key'),
            provider
        );
    } else {
        const data = fs.readFileSync(
            getConfig('blockchain.keystores.default.file_path'),
            {
                flag: 'a+',
            }
        );
        botWallet = ethers.Wallet.fromEncryptedJsonSync(data, keystorePassword);
        botWallet = botWallet.connect(provider);
    }

    defaultWalletManager = new NonceManager(botWallet);
    botWallets.default = { default: defaultWalletManager };

    logger.info(`Created default wallet manager : ${botWallet.address}`);
    return defaultWalletManager;
}

function createWallet(providerKey, walletKey) {
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    walletKey = walletKey || DEFAULT_WALLET_KEY;
    let wallet;
    const provider = getAlchemyRpcProvider(providerKey);
    const botType = process.env.BOT_ENV.toLowerCase();
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
        `Create new wallet[${walletKey}] ${wallet.address}, and connect to ${providerKey} provider`
    );
    return wallet;
}

function getWalletNonceManager(providerKey, accountKey) {
    // only for test
    const providerKeys = Object.keys(botWallets);
    for (let i = 0; i < providerKeys.length; i += 1) {
        const key = providerKeys[i];
        const walletKeys = Object.keys(botWallets[key]);
        logger.info(
            `provider key [${key}]: wallets ${JSON.stringify(walletKeys)}`
        );
    }
    // =====================

    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    accountKey = accountKey || DEFAULT_WALLET_KEY;

    if (
        providerKey === DEFAULT_PROVIDER_KEY &&
        accountKey === DEFAULT_WALLET_KEY
    ) {
        return getNonceManager();
    }

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

async function syncManagerNonce(providerkey, walletKey) {
    const walletManager = getWalletNonceManager(providerkey, walletKey);
    // Get nonce from chain
    const transactionCountInChain = await walletManager
        .getTransactionCount()
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                `${providerkey} : ${walletKey} Get bot nonce from chain failed.`,
                MESSAGE_TYPES.adjustNonce
            );
        });
    // Get local nonce
    const transactionCountInLocal = await walletManager
        .getTransactionCount('pending')
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                `${providerkey} : ${walletKey} Get bot nonce from local failed.`,
                MESSAGE_TYPES.adjustNonce
            );
        });
    // Adjust local nonce
    if (transactionCountInChain > transactionCountInLocal) {
        walletManager.setTransactionCount(transactionCountInChain);
        sendMessageToChannel(DISCORD_CHANNELS.botLogs, {
            message: `Set bot[${providerkey} : ${walletKey}] Nonce to ${transactionCountInChain}`,
            type: MESSAGE_TYPES.adjustNonce,
        });
    }
}

async function checkAccountBalance(walletManager, botBalanceWarnVault) {
    const botAccount = walletManager.signer.address;
    const botType = `${process.env.BOT_ENV.toLowerCase()}Bot`;
    const accountLabel = shortAccount(botAccount);
    const balance = await walletManager.getBalance().catch((error) => {
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

async function checkAccountsBalance(botBalanceWarnVault) {
    const providerskey = Object.keys(botWallets);
    const checkPromise = [];
    for (let i = 0; i < providerskey.length; i += 1) {
        const walletsKey = Object.keys(botWallets[providerskey[i]]);
        for (let j = 0; j < walletsKey.length; j += 1) {
            checkPromise.push(
                checkAccountBalance(
                    botWallets[providerskey[i]][walletsKey[j]],
                    botBalanceWarnVault
                )
            );
        }
    }
    await Promise.all(checkPromise);
}

async function getCurrentBlockNumber(providerKey) {
    const block = await getAlchemyRpcProvider(providerKey)
        .getBlockNumber()
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                'Get current block number from chain failed.'
            );
        });
    return block;
}

async function getTimestampByBlockNumber(blockNumber, provider) {
    provider = provider || getAlchemyRpcProvider();
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
    getSocketProvider,
    getRpcProvider,
    getAlchemyRpcProvider,
    getWalletNonceManager,
    syncManagerNonce,
    checkAccountsBalance,
    getCurrentBlockNumber,
    getTimestampByBlockNumber,
};
