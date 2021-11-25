import { pendingTransactions } from './storage';
import { readPendingTransaction, updatePendingTransaction } from './fileUtils';
import { getVaultStableCoins } from '../contract/allContracts';
import { getAlchemyRpcProvider } from './chainUtil';
import { BlockChainCallError } from './error';
import { getPnlKeyData, getInvestKeyData, getHarvestKeyData, getRebalanceKeyData } from './actionDataFunder';
import { MESSAGE_TYPES } from './discord/discordService';
import { getConfig } from './configUtil';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const vaultStableCoins = getVaultStableCoins();

function addPendingTransaction(typeKey, basicInfo, transactionResponse) {
    const {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes,
        methodName,
        label,
    } = basicInfo;
    console.log(`transactionResponse: ${JSON.stringify(transactionResponse)}`);
    pendingTransactions.set(typeKey, {
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
    console.log(`pendingTx ${pendingTransactions.size}`);
    updatePendingTransaction(pendingTransactions);
}

async function parseAdditionalData(type, hash, transactionReceipt, providerKey) {
    const typeSplit = type.split('-');
    const action = typeSplit[0];
    logger.info(`Action: ${action}`);
    let result;
    switch (action) {
        case 'pnl':
            result = await getPnlKeyData(hash, transactionReceipt, providerKey);
            break;
        case 'invest':
            result = await getInvestKeyData(
                hash,
                vaultStableCoins.tokens[typeSplit[1]],
                transactionReceipt,
                providerKey
            );
            break;
        case 'harvest':
            result = await getHarvestKeyData(hash, transactionReceipt, providerKey);
            break;
        case 'rebalance':
            result = await getRebalanceKeyData(hash, transactionReceipt, providerKey);
            break;
        default:
            logger.warn(`Not fund action: ${action}`);
    }
    return result;
}

async function getReceipt(type) {
    const transactionInfo = pendingTransactions.get(type);
    const { label: msgLabel, hash, providerKey } = transactionInfo;
    const provider = getAlchemyRpcProvider(providerKey);
    const transactionReceipt = await provider
        .getTransactionReceipt(hash)
        .catch((err) => {
            logger.error(err);
            throw new BlockChainCallError(
                `Get receipt of ${hash} from chain failed.`,
                MESSAGE_TYPES[msgLabel]
            );
        });
    if (transactionReceipt) {
        pendingTransactions.delete(type);
    }
    const result = await parseAdditionalData(type, hash, transactionReceipt, providerKey);
    return { type, msgLabel, hash, transactionReceipt, additionalData: result };
}

async function checkPendingTransactions(types?) {
    logger.info(`pendingTransactions.size: ${pendingTransactions.size}`);
    let result: any = [];
    if (!pendingTransactions.size) return result;
    types = types || Array.from(pendingTransactions.keys());
    const pendingCheckPromise: Promise<any>[] = [];
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        logger.info(`pending keys: ${type}`);
        const transactionInfo = pendingTransactions.get(type);
        if (transactionInfo) {
            pendingCheckPromise.push(getReceipt(type));
        }
    }
    result = await Promise.all(pendingCheckPromise);
    updatePendingTransaction(pendingTransactions);
    return result;
}

function syncPendingTransactions() {
    const filePendingTransactions = readPendingTransaction();
    // logger.info(`filePendingTransactions ${filePendingTransactions.size()}`);
    pendingTransactions.clear();
    for (const [key, value] of filePendingTransactions) {
        pendingTransactions.set(key, value);
    }
    logger.info(`sync pending transactions ${pendingTransactions.size}`);
}

export {
    checkPendingTransactions,
    addPendingTransaction,
    syncPendingTransactions,
};
