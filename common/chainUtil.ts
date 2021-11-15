import { ethers } from 'ethers';
import fs from 'fs';
import { BigNumber } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { SettingError, BlockChainCallError } from './error';
import { shortAccount } from './digitalUtil';
import { sendMessageToChannel, MESSAGE_TYPES, DISCORD_CHANNELS } from './discord/discordService';
import { botBalanceMessage } from '../discordMessage/botBalanceMessage';
import { sendAlertMessage } from './alertMessageSender';
import { getConfig } from './configUtil';
import { PrivateProvider } from './privateProvider';

const botEnv = process.env.BOT_ENV?.toLowerCase();
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
let infruraRpcProvider;
let defaultWalletManager;
let privateProvider;
const rpcProviders = {};
const infruraRpcProviders = {};
const botWallets = {};
const failedTimes = { accountBalance: 0 };
const failedAlertTimes = getConfig('call_failed_time', false) as number || 2;
const retryTimes = getConfig('timeout_retry', false) as number || 1;
const stallerTime = getConfig('timeout_retry_staller', false) as number || 1000;
const needPrivateTransaction = getConfig('private_transaction', false) as boolean || false;

const network = getConfig('blockchain.network') as string;
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

// this function is to hack the alchemyprovider for EIP-1559
// it call the perform in JsonPrcProvider to skip the check
function createProxyForAlchemyRpcProvider(alchemyProvider) {
    const handler = {
        get(target, property) {
            if (property === 'perform') {
                const jsonProvider = Object.getPrototypeOf(
                    target.constructor.prototype
                );
                return jsonProvider[property];
            }
            return target[property];
        },
    };
    rpcProvider = new Proxy(alchemyProvider, handler);
    return rpcProvider;
}

function staller(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration);
    });
}

function createProxyForProvider(provider, providerKeyConfig) {
    const handler = {
        get(target, property) {
            if (property === 'perform') {
                return async function (...args) {
                    for (let attempt = 0; attempt <= retryTimes; attempt += 1) {
                        let result;
                        try {
                            result = Promise.resolve(
                                Reflect.apply(target[property], target, args)
                            );
                        } catch (error) {
                            if (
                                //@ts-ignore
                                error.message.match(/429 Too Many Requests/gi)
                            ) {
                                const providerKey =
                                    getConfig(providerKeyConfig);
                                sendAlertMessage({
                                    discord: `Provider : ${providerKey} trigger rate limit.`,
                                });
                                throw error;
                                //@ts-ignore
                            } else if (error.message.match(/timeout/gi)) {
                                if (attempt >= retryTimes) throw error;
                                // eslint-disable-next-line no-await-in-loop
                                await staller(stallerTime);
                                // eslint-disable-next-line no-continue
                                continue;
                            }
                            throw error;
                        }
                        return result;
                    }
                };
            }
            return target[property];
        },
    };
    return new Proxy(provider, handler);
}

function createAlchemyRpcProvider() {
    if (rpcProvider) {
        return rpcProvider;
    }
    logger.info('Create default Alchemy Rpc provider.');
    const defaultApiKey = 'blockchain.alchemy_api_keys.default';
    const apiKey = getConfig(defaultApiKey);
    const alchemyProvider = new ethers.providers.AlchemyProvider(
        network,
        apiKey
    );
    rpcProvider = createProxyForProvider(alchemyProvider, defaultApiKey);
    return rpcProvider;
}

function createInfruraRpcProvider() {
    if (infruraRpcProvider) {
        return infruraRpcProvider;
    }
    logger.info('Create default Infrura Rpc provider.');
    const defaultApiKey = 'blockchain.infura_api_keys.default';
    const apiKey = getConfig(defaultApiKey);
    const provider = new ethers.providers.InfuraProvider(network, apiKey);
    infruraRpcProvider = createProxyForProvider(provider, defaultApiKey);
    return infruraRpcProvider;
}

function createPrivateProvider() {
    if (!privateProvider) {
        logger.info('Create private provider.');
        privateProvider = new PrivateProvider(network);
    }
    return privateProvider;
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

function getAlchemyRpcProvider(providerKey?: any) {
    // only for test
    const providerKeys = Object.keys(rpcProviders);
    // logger.info(`providerKeys: ${JSON.stringify(providerKeys)}`);
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    if (providerKey === DEFAULT_PROVIDER_KEY) {
        if (process.env.NODE_ENV === 'develop') {
            result = getDefaultProvider();
        } else {
            result = createAlchemyRpcProvider();
        }
    } else {
        result = rpcProviders[providerKey];
        if (!result) {
            const key = `blockchain.alchemy_api_keys.${providerKey}`;
            const apiKeyValue = getConfig(key);
            if (process.env.NODE_ENV === 'develop') {
                result = ethers.providers.getDefaultProvider(network);
            } else {
                const alchemyProvider = new ethers.providers.AlchemyProvider(
                    network,
                    apiKeyValue
                );
                result = createProxyForProvider(alchemyProvider, key);
            }

            logger.info(`Create a new ${providerKey} Rpc provider.`);
            rpcProviders[providerKey] = result;
        }
    }
    return result;
}

function getInfruraRpcProvider(providerKey) {
    // only for test
    const providerKeys = Object.keys(infruraRpcProviders);
    logger.info(`infrura provider Keys: ${JSON.stringify(providerKeys)}`);
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    if (providerKey === DEFAULT_PROVIDER_KEY) {
        if (process.env.NODE_ENV === 'develop') {
            result = getDefaultProvider();
        } else {
            result = createInfruraRpcProvider();
        }
    } else {
        result = infruraRpcProviders[providerKey];
        if (!result) {
            const key = `blockchain.infura_api_keys.${providerKey}`;
            const apiKeyValue = getConfig(key);
            if (process.env.NODE_ENV === 'develop') {
                result = ethers.providers.getDefaultProvider(network);
            } else {
                const tempProvider = new ethers.providers.InfuraProvider(
                    network,
                    apiKeyValue
                );
                result = createProxyForProvider(tempProvider, key);
            }

            logger.info(`Create a new ${providerKey} Infrura Rpc provider.`);
            infruraRpcProviders[providerKey] = result;
        }
    }
    return result;
}

function getTransactionProvider(providerKey) {
    let provider;
    if (needPrivateTransaction && network === 'mainnet') {
        provider = createPrivateProvider();
    } else {
        provider = getAlchemyRpcProvider(providerKey);
    }
    return provider;
}

function getNonceManager() {
    if (defaultWalletManager) {
        return defaultWalletManager;
    }

    const provider = getTransactionProvider(DEFAULT_PROVIDER_KEY);
    const keystorePassword = getConfig('blockchain.keystores.default.password') as string;
    let botWallet;
    if (keystorePassword === 'NO_PASSWORD') {
        botWallet = new ethers.Wallet(
            getConfig('blockchain.keystores.default.private_key') as string,
            provider
        );
    } else {
        const data = fs.readFileSync(
            getConfig('blockchain.keystores.default.file_path') as string,
            {
                flag: 'r',
            }
        );
        botWallet = ethers.Wallet.fromEncryptedJsonSync((data as unknown as string), keystorePassword);
        botWallet = botWallet.connect(provider);
    }

    defaultWalletManager = new NonceManager(botWallet);
    //@ts-ignore
    botWallets.default = { default: defaultWalletManager };

    logger.info(`Created default wallet manager : ${botWallet.address}`);
    return defaultWalletManager;
}

function createWallet(providerKey, walletKey) {
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    walletKey = walletKey || DEFAULT_WALLET_KEY;
    let wallet;
    const provider = getTransactionProvider(providerKey);
    const botType = process.env.BOT_ENV?.toLowerCase();
    const keystorePassword = getConfig(
        `blockchain.keystores.${botType}.${walletKey}_password`
    ) as string;
    if (keystorePassword === 'NO_PASSWORD') {
        const privateKey = getConfig(
            `blockchain.keystores.${botType}.${walletKey}_private_key`
        ) as string;
        wallet = new ethers.Wallet(privateKey, provider);
    } else {
        const keystore = getConfig(
            `blockchain.keystores.${botType}.${walletKey}_file_path`
        ) as string;
        const data = fs.readFileSync(keystore, {
            flag: 'r',
        });
        wallet = ethers.Wallet.fromEncryptedJsonSync((data as unknown as string), keystorePassword);
        wallet = wallet.connect(provider);
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
    const botType = `${process.env.BOT_ENV?.toLowerCase()}Bot`;
    const accountLabel = shortAccount(botAccount);
    const balance = await walletManager.getBalance().catch((error) => {
        logger.error(error);
        failedTimes.accountBalance += 1;
        const embedMessage = {
            type: MESSAGE_TYPES[botType],
            description: `[WARN] B7 - Call ${botType} ${accountLabel}'s ETH balance txn failed, check balance didn't complate`,
            urls: [
                {
                    label: accountLabel,
                    type: 'account',
                    value: botAccount,
                },
            ],
        };
        if (failedTimes.accountBalance > failedAlertTimes) {
            sendAlertMessage({
                discord: embedMessage,
            });
        }
        throw new BlockChainCallError(
            `Get ETH balance of bot:${botAccount} failed.`,
            MESSAGE_TYPES[botType]
        );
    });
    failedTimes.accountBalance = 0;
    if (balance.lte(BigNumber.from(botBalanceWarnVault.warn))) {
        const level = balance.lte(BigNumber.from(botBalanceWarnVault.critial))
            ? '[CRIT]'
            : '[WARN]';
        botBalanceMessage({
            botAccount,
            botType,
            balance,
            level,
        });
    }
}

async function checkAccountsBalance(botBalanceWarnVault) {
    const providerskey = Object.keys(botWallets);
    const checkPromise: any = [];
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

export {
    getDefaultProvider,
    getSocketProvider,
    getInfruraRpcProvider,
    getAlchemyRpcProvider,
    getTransactionProvider,
    getWalletNonceManager,
    syncManagerNonce,
    checkAccountsBalance,
    getCurrentBlockNumber,
    getTimestampByBlockNumber,
};
