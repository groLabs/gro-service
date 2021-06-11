const { BigNumber } = require('ethers');
const { getPriceObject } = require('./priceManager');
const { getWalletNonceManager } = require('../common/chainUtil');
const { addPendingTransaction } = require('../common/storage');
const { BlockChainCallError } = require('../common/error');

const runEnv = process.env.NODE_ENV.toLowerCase();

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const methodGasMap = {
    updateTokenRatios: 'fast',
    stop: 'rapid',
    pause: 'rapid',
    invest: 'slow',
    investToCurveVault: 'slow',
    strategyHarvest: 'standard',
    execPnL: 'fast',
    rebalance: 'rapid',
    getSafePriceFeed: 'standard',
};

async function getGasPrice(methodName) {
    const priceObject = await getPriceObject();
    return priceObject[methodGasMap[methodName]];
}

async function increaseGasPrice(methodName, oldGasPrice, resendTimes) {
    const gasPrice = await getGasPrice(methodName);
    if (gasPrice) {
        oldGasPrice = gasPrice;
    }
    const oldPrice = BigNumber.from(oldGasPrice);
    const newPrice = oldPrice
        .mul(BigNumber.from(100 + resendTimes * 10))
        .div(BigNumber.from(100));
    return newPrice;
}

async function wrapSendTransaction(contract, methodName, params = []) {
    const method = contract[methodName];
    if (runEnv === 'mainnet') {
        const gasPrice = await getGasPrice(methodName);
        logger.info(`${methodName} gasPrice: ${gasPrice}`);
        if (gasPrice) {
            return method(...params, {
                gasPrice: BigNumber.from(gasPrice),
            });
        }
    }
    return method(...params);
}

async function pendingTransactionResend(type, oldTransaction) {
    const {
        label: msgLabel,
        blockNumber,
        hash,
        providerKey,
        walletKey,
        reSendTimes,
        methodName,
        transactionRequest,
    } = oldTransaction;
    const newGasPrice = await increaseGasPrice(
        methodName,
        transactionRequest.gasPrice,
        reSendTimes + 1
    );
    const newGasPriceHex = `0x${Number(newGasPrice).toString(16)}`;
    transactionRequest.gasPrice = newGasPriceHex;
    const newTransactionRequest = {
        nonce: transactionRequest.nonce,
        gasPrice: newGasPrice,
        gasLimit: transactionRequest.gasLimit,
        to: transactionRequest.to,
        value: transactionRequest.value,
        data: transactionRequest.data,
        chainId: transactionRequest.chainId,
        from: transactionRequest.from,
    };
    logger.info(
        `New TransactionRequest: ${JSON.stringify(newTransactionRequest)}`
    );
    const transactionResponse = await getWalletNonceManager(
        providerKey,
        walletKey
    )
        .sendTransaction(newTransactionRequest)
        .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError(
                `Resend transaction: ${hash} failed.`,
                msgLabel
            );
        });
    addPendingTransaction(
        type,
        {
            blockNumber,
            methodName,
            reSendTimes: reSendTimes + 1,
            label: msgLabel,
        },
        transactionResponse
    );
    logger.info(
        `${type} transaction resend with gas price: ${newGasPrice} and resend times: ${
            reSendTimes + 1
        }`
    );
}

module.exports = {
    wrapSendTransaction,
    pendingTransactionResend,
};
