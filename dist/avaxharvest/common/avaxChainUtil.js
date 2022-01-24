const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const { BigNumber } = require('ethers');
const { SettingError, BlockChainCallError, } = require('../../dist/common/error');
const { shortAccount } = require('../../common/digitalUtil');
const { sendMessageToChannel, MESSAGE_TYPES, DISCORD_CHANNELS, } = require('../../dist/common/discord/discordService');
const { botBalanceMessage, } = require('../../dist/discordMessage/botBalanceMessage');
const { sendAlertMessage } = require('../../dist/common/alertMessageSender');
const { getConfig } = require('../../dist/common/configUtil');
const logger = require('../avaxharvestLogger');
const DEFAULT_PROVIDER_KEY = 'default';
const DEFAULT_WALLET_KEY = 'default';
if (!process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`] &&
    process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`] === 'NO_PASSWORD') {
    const err = new SettingError(`Environment variable ${`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`} are not set.`);
    logger.error(err);
    throw err;
}
const rpcProviders = {};
const botWallets = {};
const failedTimes = { accountBalance: 0 };
const failedAlertTimes = getConfig('call_failed_time', false) || 2;
const AVAXRPCURL = getConfig('avalanche.rpc_url', false) ||
    'https://api.avax.network/ext/bc/C/rpc';
const network = getConfig('blockchain.network');
logger.info(`network: ${network}`);
function getAvaxRpcProvider(providerKey) {
    // only for test
    // =====================
    let result;
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    result = rpcProviders[providerKey];
    if (!result) {
        if (process.env.NODE_ENV === 'develop') {
            result = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        }
        else {
            result = new ethers.providers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
        }
        logger.info(`Create a new ${providerKey} Rpc provider.`);
        rpcProviders[providerKey] = result;
    }
    return result;
}
// function getNonceManager() {
//     if (defaultWalletManager) {
//         return defaultWalletManager;
//     }
//     const provider = getAvaxRpcProvider();
//     const keystorePassword = getConfig('blockchain.keystores.default.password');
//     let botWallet;
//     if (keystorePassword === 'NO_PASSWORD') {
//         botWallet = new ethers.Wallet(
//             getConfig('blockchain.keystores.default.private_key'),
//             provider
//         );
//     } else {
//         const data = fs.readFileSync(
//             getConfig('blockchain.keystores.default.file_path'),
//             {
//                 flag: 'r',
//             }
//         );
//         botWallet = ethers.Wallet.fromEncryptedJsonSync(data, keystorePassword);
//         botWallet = botWallet.connect(provider);
//     }
//     defaultWalletManager = botWallet;
//     botWallets.default = { default: defaultWalletManager };
//     logger.info(`Created default wallet manager : ${botWallet.address}`);
//     return defaultWalletManager;
// }
function createWallet(providerKey, walletKey) {
    providerKey = providerKey || DEFAULT_PROVIDER_KEY;
    walletKey = walletKey || DEFAULT_WALLET_KEY;
    let wallet;
    const provider = getAvaxRpcProvider();
    const botType = process.env.BOT_ENV.toLowerCase();
    const keystorePassword = getConfig(`blockchain.keystores.${botType}.${walletKey}_password`);
    if (keystorePassword === 'NO_PASSWORD') {
        const privateKey = getConfig(`blockchain.keystores.${botType}.${walletKey}_private_key`);
        wallet = new ethers.Wallet(privateKey, provider);
    }
    else {
        const keystore = getConfig(`blockchain.keystores.${botType}.${walletKey}_file_path`);
        const data = fs.readFileSync(keystore, {
            flag: 'r',
        });
        wallet = ethers.Wallet.fromEncryptedJsonSync(data, keystorePassword);
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
    // if (
    //     providerKey === DEFAULT_PROVIDER_KEY &&
    //     accountKey === DEFAULT_WALLET_KEY
    // ) {
    //     return getNonceManager();
    // }
    let walletNonceManager;
    if (!botWallets[providerKey]) {
        botWallets[providerKey] = {};
    }
    const providerAccounts = botWallets[providerKey];
    walletNonceManager = providerAccounts[accountKey];
    if (!walletNonceManager) {
        const wallet = createWallet(providerKey, accountKey);
        walletNonceManager = wallet;
        providerAccounts[accountKey] = walletNonceManager;
    }
    return walletNonceManager;
}
async function checkAccountBalance(signer, botBalanceWarnVault, walletKey) {
    const botAccount = signer.address;
    const botType = `${process.env.BOT_ENV.toLowerCase()}Bot`;
    const accountLabel = shortAccount(botAccount);
    const balance = await signer.getBalance().catch((error) => {
        logger.error(error);
        failedTimes.accountBalance += 1;
        const embedMessage = {
            type: MESSAGE_TYPES[botType],
            description: `[WARN][Avalanche] B7 - Call ${botType} ${accountLabel}'s AVAX balance txn failed, check balance didn't complate`,
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
        throw new BlockChainCallError(`Get AVAX balance of bot:${botAccount} failed.`, MESSAGE_TYPES[botType]);
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
            walletKey,
            chain: 'avax',
        });
    }
}
async function checkAccountsBalance(botBalanceWarnVault) {
    const providerskey = Object.keys(botWallets);
    const checkPromise = [];
    for (let i = 0; i < providerskey.length; i += 1) {
        const walletsKey = Object.keys(botWallets[providerskey[i]]);
        for (let j = 0; j < walletsKey.length; j += 1) {
            checkPromise.push(checkAccountBalance(botWallets[providerskey[i]][walletsKey[j]], botBalanceWarnVault, walletsKey[j]));
        }
    }
    await Promise.all(checkPromise);
}
async function getCurrentBlockNumber(providerKey) {
    const block = await getAvaxRpcProvider(providerKey)
        .getBlockNumber()
        .catch((error) => {
        logger.error(error);
        throw new BlockChainCallError('Get current block number from chain failed.');
    });
    return block;
}
async function getTimestampByBlockNumber(blockNumber, provider) {
    provider = provider || getAvaxRpcProvider();
    const block = await provider.getBlock(blockNumber).catch((error) => {
        logger.error(error);
        throw new BlockChainCallError(`Get block by number ${blockNumber} failed`);
    });
    return block.timestamp.toString();
}
async function getPriorityPrice() {
    const body = {
        jsonrpc: '2.0',
        method: 'eth_maxPriorityFeePerGas',
        params: [],
        id: 1,
    };
    const result = { status: 0 };
    const response = await axios({
        method: 'post',
        url: AVAXRPCURL,
        data: body,
    }).catch((error) => {
        logger.error(error);
        result.errorMsg = error.message;
    });
    if (response.data.error) {
        result.errorMsg = response.data.error;
    }
    else {
        result.data = response.data.result;
        result.status = 1;
    }
    return result;
}
async function sendTransaction(contract, methodName, params = []) {
    const method = contract[methodName];
    const priorityPriceObject = await getPriorityPrice();
    let maxPriorityFeePerGas = BigNumber.from('250000000');
    if (priorityPriceObject.status && priorityPriceObject.data !== '0x0') {
        maxPriorityFeePerGas = BigNumber.from(priorityPriceObject.data);
    }
    else {
        logger.warn(`Get maxPriorityFeePerGas failed for ${priorityPriceObject.errorMsg || priorityPriceObject.data}, uses the default maxPriorityFeePerGas: ${maxPriorityFeePerGas}`);
    }
    const block = await contract.provider.getBlock('latest');
    const { baseFeePerGas } = block;
    const distBaseFeePerGas = baseFeePerGas
        .mul(BigNumber.from(110))
        .div(BigNumber.from(100));
    const maxFeePerGas = distBaseFeePerGas.add(maxPriorityFeePerGas);
    const gasLimit = BigNumber.from(3000000);
    logger.info(`send ${methodName} with maxPriorityFeePerGas:${maxPriorityFeePerGas} baseFeePerGas:${baseFeePerGas} distBaseFeePerGas:${distBaseFeePerGas} maxFeePerGas:${maxFeePerGas}`);
    const promise = await method(...params, {
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit,
    });
    return promise.wait();
}
function sleep(ms) {
    // add ms millisecond timeout before promise resolution
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function sendTransactionWithRetry(contract, methodName, params = []) {
    logger.info(`${methodName}: params: ${JSON.stringify(params)}`);
    let retryTimes = 0;
    while (true) {
        if (retryTimes > 2) {
            throw new Error(`${methodName} resend: ${retryTimes}. doesn't send again`);
        }
        try {
            // eslint-disable-next-line no-await-in-loop
            const transactionResult = await sendTransaction(contract, methodName, params);
            if (transactionResult.status) {
                return transactionResult;
            }
            logger.info(`${methodName} reverted, resend: ${retryTimes}`);
        }
        catch (error) {
            logger.info(`Send ${methodName} error: ${error.message},resend: ${retryTimes} `);
        }
        retryTimes += 1;
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000);
    }
}
module.exports = {
    getWalletNonceManager,
    checkAccountsBalance,
    getCurrentBlockNumber,
    getTimestampByBlockNumber,
    getAvaxRpcProvider,
    sendTransaction,
    sendTransactionWithRetry,
};
