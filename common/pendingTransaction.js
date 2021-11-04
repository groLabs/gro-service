const { pendingTransactions } = require('./storage');
const { getVaultStableCoins } = require('../contract/allContracts');
const { getAlchemyRpcProvider } = require('./chainUtil');
const { BlockChainCallError } = require('./error').default;
const {
    getPnlKeyData,
    getInvestKeyData,
    getHarvestKeyData,
    getRebalanceKeyData,
} = require('./actionDataFunder');
const { MESSAGE_TYPES } = require('../dist/common/discord/discordService').default;

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const vaultStableCoins = getVaultStableCoins();

async function parseAdditionalData(type, hash, transactionReceipt) {
    const typeSplit = type.split('-');
    const action = typeSplit[0];
    logger.info(`Action: ${action}`);
    let result;
    switch (action) {
        case 'pnl':
            result = await getPnlKeyData(hash, transactionReceipt);
            break;
        case 'invest':
            result = await getInvestKeyData(
                hash,
                vaultStableCoins.tokens[typeSplit[1]],
                transactionReceipt
            );
            break;
        case 'harvest':
            result = await getHarvestKeyData(hash, transactionReceipt);
            break;
        case 'rebalance':
            result = await getRebalanceKeyData(hash, transactionReceipt);
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
    const result = await parseAdditionalData(type, hash, transactionReceipt);
    return { type, msgLabel, hash, transactionReceipt, additionalData: result };
}

async function checkPendingTransactions(types) {
    logger.info(`pendingTransactions.size: ${pendingTransactions.size}`);
    let result = [];
    if (!pendingTransactions.size) return result;
    types = types || Array.from(pendingTransactions.keys());
    const pendingCheckPromise = [];
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        logger.info(`pending keys: ${type}`);
        const transactionInfo = pendingTransactions.get(type);
        if (transactionInfo) {
            pendingCheckPromise.push(getReceipt(type));
        }
    }
    result = Promise.all(pendingCheckPromise);
    return result;
}

module.exports = {
    checkPendingTransactions,
};
