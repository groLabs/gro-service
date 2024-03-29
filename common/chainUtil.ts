import { ethers } from 'ethers';
import fs from 'fs';
import { BigNumber } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { SettingError, BlockChainCallError } from './error';
import { shortAccount } from './digitalUtil';
import {
    sendMessageToChannel,
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
} from './discord/discordService';
import { botBalanceMessage } from '../discordMessage/botBalanceMessage';
import { sendAlertMessage } from './alertMessageSender';
import { getConfig } from './configUtil';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const DEFAULT_PROVIDER_KEY = 'default';
const DEFAULT_WALLET_KEY = 'default';

let defaultWalletManager;
let privateProvider;
const rpcProviders = {};
const infuraRpcProviders = {};
const botWallets = {};
const failedTimes = { accountBalance: 0 };
const failedAlertTimes = (getConfig('call_failed_time', false) as number) || 2;
const retryTimes = (getConfig('timeout_retry', false) as number) || 1;
const stallerTime =
    (getConfig('timeout_retry_staller', false) as number) || 1000;
const needPrivateTransaction =
    (getConfig('private_transaction', false) as boolean) || false;

const network = getConfig('blockchain.network') as string;
logger.info(`network: ${network}`);

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

function createPrivateProvider() {
    if (!privateProvider) {
        logger.info('Create private provider.');
        const rpcURL = 'https://rpc.ethermine.org';
        privateProvider = new ethers.providers.JsonRpcProvider(rpcURL);
    }
    return privateProvider;
}

function getAlchemyRpcProvider(providerKey?: any) {
    // only for test
    const providerKeys = Object.keys(rpcProviders);
    // logger.info(`providerKeys: ${JSON.stringify(providerKeys)}`);
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;

    result = rpcProviders[providerKey];
    if (!result) {
        const key = `blockchain.alchemy_api_keys.${providerKey}`;
        const apiKeyValue = getConfig(key);
        if (process.env.NODE_ENV === 'develop') {
            result = new ethers.providers.JsonRpcProvider(
                'http://127.0.0.1:8545'
            );
        } else {
            const alchemyProvider = new ethers.providers.AlchemyProvider(
                network,
                apiKeyValue
            );
            result = createProxyForProvider(alchemyProvider, key);
        }
        rpcProviders[providerKey] = result;
        logger.info(`Create a new ${providerKey} Alchemy Rpc provider.`);
    }
    return result;
}

function getInfuraRpcProvider(providerKey) {
    // only for test
    const providerKeys = Object.keys(infuraRpcProviders);
    logger.info(`Infura provider Keys: ${JSON.stringify(providerKeys)}`);
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;

    result = infuraRpcProviders[providerKey];
    if (!result) {
        const key = `blockchain.infura_api_keys.${providerKey}`;
        const apiKeyValue = getConfig(key);
        if (process.env.NODE_ENV === 'develop') {
            result = new ethers.providers.JsonRpcProvider(
                'http://127.0.0.1:8545'
            );
        } else {
            const tempProvider = new ethers.providers.InfuraProvider(
                network,
                apiKeyValue
            );
            result = createProxyForProvider(tempProvider, key);
        }

        infuraRpcProviders[providerKey] = result;
        logger.info(`Create a new ${providerKey} Infura Rpc provider.`);
    }

    return result;
}

function getAvaxArchivedNodeRpcProvider() {
    let result = rpcProviders['avax_archived_node'];
    if (!result) {
        const { url, user, password } = getConfig(
            'blockchain.avax_api_keys.archived_node'
        );
        result = new ethers.providers.JsonRpcProvider({
            url,
            user,
            password,
        });
        rpcProviders['avax_archived_node'] = result;
        logger.info(`Create a new avax_archived_node rpc provider.`);
    }
    return result;
}

function getAvaxFullNodeRpcProvider() {
    let result = rpcProviders['avax_full_node'];
    if (!result) {
        const { url, user, password } = getConfig(
            'blockchain.avax_api_keys.full_node'
        );
        result = new ethers.providers.JsonRpcProvider({
            url,
            user,
            password,
        });
        rpcProviders['avax_full_node'] = result;
        logger.info(`Create a new avax_full_node rpc provider.`);
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
    const keystorePassword = getConfig(
        'blockchain.keystores.default.password'
    ) as string;
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
        botWallet = ethers.Wallet.fromEncryptedJsonSync(
            data as unknown as string,
            keystorePassword
        );
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
        wallet = ethers.Wallet.fromEncryptedJsonSync(
            data as unknown as string,
            keystorePassword
        );
        wallet = wallet.connect(provider);
    }
    logger.info(
        `Create new wallet[${walletKey}] ${wallet.address}, and connect to ${providerKey} provider`
    );
    return wallet;
}

function getWalletNonceManager(providerKey?, accountKey?) {
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

async function getCurrentBlockNumber(providerKey?) {
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
    getInfuraRpcProvider,
    getAlchemyRpcProvider,
    getAvaxFullNodeRpcProvider,
    getAvaxArchivedNodeRpcProvider,
    getTransactionProvider,
    getWalletNonceManager,
    syncManagerNonce,
    checkAccountsBalance,
    getCurrentBlockNumber,
    getTimestampByBlockNumber,
};
