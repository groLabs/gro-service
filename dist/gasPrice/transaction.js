const { BigNumber } = require('ethers');
const { getAlchemyPriorityPrice, getAlchemy24HoursLowestFee, } = require('./priceManager');
const { getWalletNonceManager } = require('../common/chainUtil');
const { addPendingTransaction } = require('../common/pendingTransaction');
const { BlockChainCallError } = require('../dist/common/error').default;
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
async function wrapSendTransaction(contract, methodName, params = []) {
    const method = contract[methodName];
    const maxPriorityFeePerGas = BigNumber.from(await getAlchemyPriorityPrice());
    let baseFeePerGas;
    if (methodName === 'rebalance') {
        const block = await contract.provider.getBlock('latest');
        baseFeePerGas = block.baseFeePerGas;
    }
    else {
        baseFeePerGas = BigNumber.from(await getAlchemy24HoursLowestFee());
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
    const newBaseFeePerGas = BigNumber.from(await getAlchemy24HoursLowestFee());
    const maxPriorityFeePerGas = BigNumber.from(await getAlchemyPriorityPrice());
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
