"use strict";
const { BigNumber } = require('ethers');
const { getAlchemyPriorityPrice } = require('./priceManager');
const { getWalletNonceManager } = require('../common/chainUtil');
const { addPendingTransaction } = require('../common/storage');
const { BlockChainCallError } = require('../common/error');
const { getConfig } = require('../common/configUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const BASE_GAS = getConfig('base_gas');
function getBaseGas(resendTime = 0) {
    const len = BASE_GAS.length;
    resendTime = resendTime >= len ? len - 1 : resendTime;
    return BigNumber.from(BASE_GAS[resendTime]);
}
async function wrapSendTransaction(contract, methodName, params = []) {
    const method = contract[methodName];
    const maxPriorityFeePerGas = BigNumber.from(await getAlchemyPriorityPrice());
    // const block = await contract.provider.getBlock('latest');
    // const maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
    const baseGas = getBaseGas(0);
    const maxFeePerGas = baseGas.add(maxPriorityFeePerGas);
    logger.info(`send tx maxPriorityFeePerGas ${maxPriorityFeePerGas} maxBaseFeePerGas ${baseGas} maxFeePerGas ${maxFeePerGas}`);
    return method(...params, {
        maxPriorityFeePerGas,
        maxFeePerGas,
    });
}
async function pendingTransactionResend(type, oldTransaction) {
    const { label: msgLabel, blockNumber, hash, providerKey, walletKey, reSendTimes, methodName, transactionRequest, } = oldTransaction;
    const reSendTime = reSendTimes + 1;
    const newBaseGas = getBaseGas(reSendTime);
    const maxPriorityFeePerGas = BigNumber.from(await getAlchemyPriorityPrice());
    const maxFeePerGas = newBaseGas.add(maxPriorityFeePerGas);
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
    const transactionResponse = await getWalletNonceManager(providerKey, walletKey)
        .sendTransaction(newTransactionRequest)
        .catch((error) => {
        logger.error(error);
        throw new BlockChainCallError(`Resend transaction: ${hash} failed.`, msgLabel);
    });
    addPendingTransaction(type, {
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
