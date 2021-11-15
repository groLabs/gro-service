"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimestampByBlockNumber = exports.getCurrentBlockNumber = exports.checkAccountsBalance = exports.syncManagerNonce = exports.getWalletNonceManager = exports.getTransactionProvider = exports.getAlchemyRpcProvider = exports.getInfruraRpcProvider = exports.getSocketProvider = exports.getDefaultProvider = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const ethers_2 = require("ethers");
const experimental_1 = require("@ethersproject/experimental");
const error_1 = require("./error");
const digitalUtil_1 = require("./digitalUtil");
const discordService_1 = require("./discord/discordService");
const botBalanceMessage_1 = require("../discordMessage/botBalanceMessage");
const alertMessageSender_1 = require("./alertMessageSender");
const configUtil_1 = require("./configUtil");
const privateProvider_1 = require("./privateProvider");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const DEFAULT_PROVIDER_KEY = 'default';
const DEFAULT_WALLET_KEY = 'default';
if (!process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`] &&
    process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`] === 'NO_PASSWORD') {
    const err = new error_1.SettingError(`Environment variable ${`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`} are not set.`);
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
const failedAlertTimes = (0, configUtil_1.getConfig)('call_failed_time', false) || 2;
const retryTimes = (0, configUtil_1.getConfig)('timeout_retry', false) || 1;
const stallerTime = (0, configUtil_1.getConfig)('timeout_retry_staller', false) || 1000;
const needPrivateTransaction = (0, configUtil_1.getConfig)('private_transaction', false) || false;
const network = (0, configUtil_1.getConfig)('blockchain.network');
logger.info(`network: ${network}`);
function getSocketProvider() {
    if (socketProvider) {
        return socketProvider;
    }
    logger.info('Create new socket provider.');
    const apiKey = (0, configUtil_1.getConfig)('blockchain.alchemy_api_keys.default');
    socketProvider = new ethers_1.ethers.providers.AlchemyWebSocketProvider(network, apiKey);
    return socketProvider;
}
exports.getSocketProvider = getSocketProvider;
// this function is to hack the alchemyprovider for EIP-1559
// it call the perform in JsonPrcProvider to skip the check
function createProxyForAlchemyRpcProvider(alchemyProvider) {
    const handler = {
        get(target, property) {
            if (property === 'perform') {
                const jsonProvider = Object.getPrototypeOf(target.constructor.prototype);
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
                            result = Promise.resolve(Reflect.apply(target[property], target, args));
                        }
                        catch (error) {
                            if (
                            //@ts-ignore
                            error.message.match(/429 Too Many Requests/gi)) {
                                const providerKey = (0, configUtil_1.getConfig)(providerKeyConfig);
                                (0, alertMessageSender_1.sendAlertMessage)({
                                    discord: `Provider : ${providerKey} trigger rate limit.`,
                                });
                                throw error;
                                //@ts-ignore
                            }
                            else if (error.message.match(/timeout/gi)) {
                                if (attempt >= retryTimes)
                                    throw error;
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
    const apiKey = (0, configUtil_1.getConfig)(defaultApiKey);
    const alchemyProvider = new ethers_1.ethers.providers.AlchemyProvider(network, apiKey);
    rpcProvider = createProxyForProvider(alchemyProvider, defaultApiKey);
    return rpcProvider;
}
function createInfruraRpcProvider() {
    if (infruraRpcProvider) {
        return infruraRpcProvider;
    }
    logger.info('Create default Infrura Rpc provider.');
    const defaultApiKey = 'blockchain.infura_api_keys.default';
    const apiKey = (0, configUtil_1.getConfig)(defaultApiKey);
    const provider = new ethers_1.ethers.providers.InfuraProvider(network, apiKey);
    infruraRpcProvider = createProxyForProvider(provider, defaultApiKey);
    return infruraRpcProvider;
}
function createPrivateProvider() {
    if (!privateProvider) {
        logger.info('Create private provider.');
        privateProvider = new privateProvider_1.PrivateProvider(network);
    }
    return privateProvider;
}
function getDefaultProvider() {
    if (defaultProvider) {
        return defaultProvider;
    }
    const options = (0, configUtil_1.getConfig)('blockchain.default_api_keys', false) || {};
    logger.info('Create a new default provider.');
    if (process.env.NODE_ENV === 'develop') {
        defaultProvider = ethers_1.ethers.providers.getDefaultProvider(network);
    }
    else {
        defaultProvider = ethers_1.ethers.providers.getDefaultProvider(network, options);
    }
    defaultProvider = ethers_1.ethers.providers.getDefaultProvider(network, options);
    return defaultProvider;
}
exports.getDefaultProvider = getDefaultProvider;
function getAlchemyRpcProvider(providerKey) {
    // only for test
    const providerKeys = Object.keys(rpcProviders);
    // logger.info(`providerKeys: ${JSON.stringify(providerKeys)}`);
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    if (providerKey === DEFAULT_PROVIDER_KEY) {
        if (process.env.NODE_ENV === 'develop') {
            result = getDefaultProvider();
        }
        else {
            result = createAlchemyRpcProvider();
        }
    }
    else {
        result = rpcProviders[providerKey];
        if (!result) {
            const key = `blockchain.alchemy_api_keys.${providerKey}`;
            const apiKeyValue = (0, configUtil_1.getConfig)(key);
            if (process.env.NODE_ENV === 'develop') {
                result = ethers_1.ethers.providers.getDefaultProvider(network);
            }
            else {
                const alchemyProvider = new ethers_1.ethers.providers.AlchemyProvider(network, apiKeyValue);
                result = createProxyForProvider(alchemyProvider, key);
            }
            logger.info(`Create a new ${providerKey} Rpc provider.`);
            rpcProviders[providerKey] = result;
        }
    }
    return result;
}
exports.getAlchemyRpcProvider = getAlchemyRpcProvider;
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
        }
        else {
            result = createInfruraRpcProvider();
        }
    }
    else {
        result = infruraRpcProviders[providerKey];
        if (!result) {
            const key = `blockchain.infura_api_keys.${providerKey}`;
            const apiKeyValue = (0, configUtil_1.getConfig)(key);
            if (process.env.NODE_ENV === 'develop') {
                result = ethers_1.ethers.providers.getDefaultProvider(network);
            }
            else {
                const tempProvider = new ethers_1.ethers.providers.InfuraProvider(network, apiKeyValue);
                result = createProxyForProvider(tempProvider, key);
            }
            logger.info(`Create a new ${providerKey} Infrura Rpc provider.`);
            infruraRpcProviders[providerKey] = result;
        }
    }
    return result;
}
exports.getInfruraRpcProvider = getInfruraRpcProvider;
function getTransactionProvider(providerKey) {
    let provider;
    if (needPrivateTransaction && network === 'mainnet') {
        provider = createPrivateProvider();
    }
    else {
        provider = getAlchemyRpcProvider(providerKey);
    }
    return provider;
}
exports.getTransactionProvider = getTransactionProvider;
function getNonceManager() {
    if (defaultWalletManager) {
        return defaultWalletManager;
    }
    const provider = getTransactionProvider(DEFAULT_PROVIDER_KEY);
    const keystorePassword = (0, configUtil_1.getConfig)('blockchain.keystores.default.password');
    let botWallet;
    if (keystorePassword === 'NO_PASSWORD') {
        botWallet = new ethers_1.ethers.Wallet((0, configUtil_1.getConfig)('blockchain.keystores.default.private_key'), provider);
    }
    else {
        const data = fs_1.default.readFileSync((0, configUtil_1.getConfig)('blockchain.keystores.default.file_path'), {
            flag: 'r',
        });
        botWallet = ethers_1.ethers.Wallet.fromEncryptedJsonSync(data, keystorePassword);
        botWallet = botWallet.connect(provider);
    }
    defaultWalletManager = new experimental_1.NonceManager(botWallet);
    //@ts-ignore
    botWallets.default = { default: defaultWalletManager };
    logger.info(`Created default wallet manager : ${botWallet.address}`);
    return defaultWalletManager;
}
function createWallet(providerKey, walletKey) {
    var _a;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    walletKey = walletKey || DEFAULT_WALLET_KEY;
    let wallet;
    const provider = getTransactionProvider(providerKey);
    const botType = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const keystorePassword = (0, configUtil_1.getConfig)(`blockchain.keystores.${botType}.${walletKey}_password`);
    if (keystorePassword === 'NO_PASSWORD') {
        const privateKey = (0, configUtil_1.getConfig)(`blockchain.keystores.${botType}.${walletKey}_private_key`);
        wallet = new ethers_1.ethers.Wallet(privateKey, provider);
    }
    else {
        const keystore = (0, configUtil_1.getConfig)(`blockchain.keystores.${botType}.${walletKey}_file_path`);
        const data = fs_1.default.readFileSync(keystore, {
            flag: 'r',
        });
        wallet = ethers_1.ethers.Wallet.fromEncryptedJsonSync(data, keystorePassword);
        wallet = wallet.connect(provider);
    }
    logger.info(`Create new wallet[${walletKey}] ${wallet.address}, and connect to ${providerKey} provider`);
    return wallet;
}
function getWalletNonceManager(providerKey, accountKey) {
    // only for test
    const providerKeys = Object.keys(botWallets);
    for (let i = 0; i < providerKeys.length; i += 1) {
        const key = providerKeys[i];
        const walletKeys = Object.keys(botWallets[key]);
        logger.info(`provider key [${key}]: wallets ${JSON.stringify(walletKeys)}`);
    }
    // =====================
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    accountKey = accountKey || DEFAULT_WALLET_KEY;
    if (providerKey === DEFAULT_PROVIDER_KEY &&
        accountKey === DEFAULT_WALLET_KEY) {
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
        walletNonceManager = new experimental_1.NonceManager(wallet);
        providerAccounts[accountKey] = walletNonceManager;
    }
    return walletNonceManager;
}
exports.getWalletNonceManager = getWalletNonceManager;
async function syncManagerNonce(providerkey, walletKey) {
    const walletManager = getWalletNonceManager(providerkey, walletKey);
    // Get nonce from chain
    const transactionCountInChain = await walletManager
        .getTransactionCount()
        .catch((error) => {
        logger.error(error);
        throw new error_1.BlockChainCallError(`${providerkey} : ${walletKey} Get bot nonce from chain failed.`, discordService_1.MESSAGE_TYPES.adjustNonce);
    });
    // Get local nonce
    const transactionCountInLocal = await walletManager
        .getTransactionCount('pending')
        .catch((error) => {
        logger.error(error);
        throw new error_1.BlockChainCallError(`${providerkey} : ${walletKey} Get bot nonce from local failed.`, discordService_1.MESSAGE_TYPES.adjustNonce);
    });
    // Adjust local nonce
    if (transactionCountInChain > transactionCountInLocal) {
        walletManager.setTransactionCount(transactionCountInChain);
        (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.botLogs, {
            message: `Set bot[${providerkey} : ${walletKey}] Nonce to ${transactionCountInChain}`,
            type: discordService_1.MESSAGE_TYPES.adjustNonce,
        });
    }
}
exports.syncManagerNonce = syncManagerNonce;
async function checkAccountBalance(walletManager, botBalanceWarnVault) {
    var _a;
    const botAccount = walletManager.signer.address;
    const botType = `${(_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase()}Bot`;
    const accountLabel = (0, digitalUtil_1.shortAccount)(botAccount);
    const balance = await walletManager.getBalance().catch((error) => {
        logger.error(error);
        failedTimes.accountBalance += 1;
        const embedMessage = {
            type: discordService_1.MESSAGE_TYPES[botType],
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
            (0, alertMessageSender_1.sendAlertMessage)({
                discord: embedMessage,
            });
        }
        throw new error_1.BlockChainCallError(`Get ETH balance of bot:${botAccount} failed.`, discordService_1.MESSAGE_TYPES[botType]);
    });
    failedTimes.accountBalance = 0;
    if (balance.lte(ethers_2.BigNumber.from(botBalanceWarnVault.warn))) {
        const level = balance.lte(ethers_2.BigNumber.from(botBalanceWarnVault.critial))
            ? '[CRIT]'
            : '[WARN]';
        (0, botBalanceMessage_1.botBalanceMessage)({
            botAccount,
            botType,
            balance,
            level,
        });
    }
}
async function checkAccountsBalance(botBalanceWarnVault) {
    const providerskey = Object.keys(botWallets);
    const checkPromise = [];
    for (let i = 0; i < providerskey.length; i += 1) {
        const walletsKey = Object.keys(botWallets[providerskey[i]]);
        for (let j = 0; j < walletsKey.length; j += 1) {
            checkPromise.push(checkAccountBalance(botWallets[providerskey[i]][walletsKey[j]], botBalanceWarnVault));
        }
    }
    await Promise.all(checkPromise);
}
exports.checkAccountsBalance = checkAccountsBalance;
async function getCurrentBlockNumber(providerKey) {
    const block = await getAlchemyRpcProvider(providerKey)
        .getBlockNumber()
        .catch((error) => {
        logger.error(error);
        throw new error_1.BlockChainCallError('Get current block number from chain failed.');
    });
    return block;
}
exports.getCurrentBlockNumber = getCurrentBlockNumber;
async function getTimestampByBlockNumber(blockNumber, provider) {
    provider = provider || getAlchemyRpcProvider();
    const block = await provider.getBlock(blockNumber).catch((error) => {
        logger.error(error);
        throw new error_1.BlockChainCallError(`Get block by number ${blockNumber} failed`);
    });
    return block.timestamp.toString();
}
exports.getTimestampByBlockNumber = getTimestampByBlockNumber;
