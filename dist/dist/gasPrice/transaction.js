"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const priceManager_1 = require("./priceManager");
const chainUtil_1 = require("../common/chainUtil");
const pendingTransaction_1 = require("../common/pendingTransaction");
const error_1 = require("../common/error");
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
async function wrapSendTransaction(contract, methodName, params = []) {
    const method = contract[methodName];
    const maxPriorityFeePerGas = ethers_1.BigNumber.from(await (0, priceManager_1.getAlchemyPriorityPrice)());
    let baseFeePerGas;
    if (methodName === 'rebalance') {
        const block = await contract.provider.getBlock('latest');
        baseFeePerGas = block.baseFeePerGas;
    }
    else {
        baseFeePerGas = ethers_1.BigNumber.from(await (0, priceManager_1.getAlchemy24HoursLowestFee)());
    }
    const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas);
    logger.info(`send tx maxPriorityFeePerGas ${maxPriorityFeePerGas} maxBaseFeePerGas ${baseFeePerGas} maxFeePerGas ${maxFeePerGas}`);
    return method(...params, {
        maxPriorityFeePerGas,
        maxFeePerGas,
    });
}
async function pendingTransactionResend(type, oldTransaction) {
    const { label: msgLabel, blockNumber, hash, providerKey, walletKey, reSendTimes, methodName, transactionRequest, } = oldTransaction;
    const reSendTime = reSendTimes + 1;
    const newBaseFeePerGas = ethers_1.BigNumber.from(await (0, priceManager_1.getAlchemy24HoursLowestFee)());
    const maxPriorityFeePerGas = ethers_1.BigNumber.from(await (0, priceManager_1.getAlchemyPriorityPrice)());
    const maxFeePerGas = newBaseFeePerGas.add(maxPriorityFeePerGas);
    const newTransactionRequest = {
        maxPriorityFeePerGas,
        maxFeePerGas,
        nonce: transactionRequest.nonce,
        gasLimit: transactionRequest.gasLimit,
        to: transactionRequest.to,
        value: transactionRequest.value,
        data: transactionRequest.data,
        chainId: transactionRequest.chainId,
        from: transactionRequest.from,
    };
    logger.info(`New TransactionRequest: ${JSON.stringify(newTransactionRequest)}`);
    const transactionResponse = await (0, chainUtil_1.getWalletNonceManager)(providerKey, walletKey)
        .sendTransaction(newTransactionRequest)
        .catch((error) => {
        logger.error(error);
        throw new error_1.BlockChainCallError(`Resend transaction: ${hash} failed.`, msgLabel);
    });
    (0, pendingTransaction_1.addPendingTransaction)(type, {
        blockNumber,
        methodName,
        reSendTimes: reSendTime,
        label: msgLabel,
    }, transactionResponse);
    logger.info(`${type} transaction resend with maxFeePerGas: ${maxFeePerGas}, maxPriorityFeePerGas: ${maxPriorityFeePerGas} and resend times: ${reSendTime}`);
}
module.exports = {
    wrapSendTransaction,
    pendingTransactionResend,
};
