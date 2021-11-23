"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPendingTransactions = exports.addPendingTransaction = exports.checkPendingTransactions = void 0;
const storage_1 = require("./storage");
const fileUtils_js_1 = require("./fileUtils.js");
const allContracts_1 = require("../contract/allContracts");
const chainUtil_1 = require("./chainUtil");
const error_1 = require("./error");
const actionDataFunder_1 = require("./actionDataFunder");
const discordService_1 = require("./discord/discordService");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const vaultStableCoins = (0, allContracts_1.getVaultStableCoins)();
function addPendingTransaction(typeKey, basicInfo, transactionResponse) {
    const { blockNumber, providerKey, walletKey, reSendTimes, methodName, label, } = basicInfo;
    console.log(`transactionResponse: ${JSON.stringify(transactionResponse)}`);
    storage_1.pendingTransactions.set(typeKey, {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes,
        methodName,
        label,
        hash: transactionResponse.hash,
        createdTime: new Date(),
        timestamp: Date.now(),
        transactionRequest: {
            nonce: transactionResponse.nonce,
            type: transactionResponse.type,
            maxPriorityFeePerGas: transactionResponse.maxPriorityFeePerGas,
            maxFeePerGas: transactionResponse.maxFeePerGas,
            gasLimit: transactionResponse.gasLimit,
            to: transactionResponse.to,
            value: transactionResponse.value,
            data: transactionResponse.data,
            chainId: transactionResponse.chainId,
            from: transactionResponse.from,
        },
    });
    console.log(`pendingTx ${storage_1.pendingTransactions.size}`);
    (0, fileUtils_js_1.updatePendingTransaction)(storage_1.pendingTransactions);
}
exports.addPendingTransaction = addPendingTransaction;
async function parseAdditionalData(type, hash, transactionReceipt, providerKey) {
    const typeSplit = type.split('-');
    const action = typeSplit[0];
    logger.info(`Action: ${action}`);
    let result;
    switch (action) {
        case 'pnl':
            result = await (0, actionDataFunder_1.getPnlKeyData)(hash, transactionReceipt, providerKey);
            break;
        case 'invest':
            result = await (0, actionDataFunder_1.getInvestKeyData)(hash, vaultStableCoins.tokens[typeSplit[1]], transactionReceipt, providerKey);
            break;
        case 'harvest':
            result = await (0, actionDataFunder_1.getHarvestKeyData)(hash, transactionReceipt, providerKey);
            break;
        case 'rebalance':
            result = await (0, actionDataFunder_1.getRebalanceKeyData)(hash, transactionReceipt, providerKey);
            break;
        default:
            logger.warn(`Not fund action: ${action}`);
    }
    return result;
}
async function getReceipt(type) {
    const transactionInfo = storage_1.pendingTransactions.get(type);
    const { label: msgLabel, hash, providerKey } = transactionInfo;
    const provider = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
    const transactionReceipt = await provider
        .getTransactionReceipt(hash)
        .catch((err) => {
        logger.error(err);
        throw new error_1.BlockChainCallError(`Get receipt of ${hash} from chain failed.`, discordService_1.MESSAGE_TYPES[msgLabel]);
    });
    if (transactionReceipt) {
        storage_1.pendingTransactions.delete(type);
    }
    const result = await parseAdditionalData(type, hash, transactionReceipt, providerKey);
    return { type, msgLabel, hash, transactionReceipt, additionalData: result };
}
async function checkPendingTransactions(types) {
    logger.info(`pendingTransactions.size: ${storage_1.pendingTransactions.size}`);
    let result = [];
    if (!storage_1.pendingTransactions.size)
        return result;
    types = types || Array.from(storage_1.pendingTransactions.keys());
    const pendingCheckPromise = [];
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        logger.info(`pending keys: ${type}`);
        const transactionInfo = storage_1.pendingTransactions.get(type);
        if (transactionInfo) {
            pendingCheckPromise.push(getReceipt(type));
        }
    }
    result = await Promise.all(pendingCheckPromise);
    (0, fileUtils_js_1.updatePendingTransaction)(storage_1.pendingTransactions);
    return result;
}
exports.checkPendingTransactions = checkPendingTransactions;
function syncPendingTransactions() {
    const filePendingTransactions = (0, fileUtils_js_1.readPendingTransaction)();
    // logger.info(`filePendingTransactions ${filePendingTransactions.size()}`);
    storage_1.pendingTransactions.clear();
    for (const [key, value] of filePendingTransactions) {
        storage_1.pendingTransactions.set(key, value);
    }
    logger.info(`sync pending transactions ${storage_1.pendingTransactions.size}`);
}
exports.syncPendingTransactions = syncPendingTransactions;
