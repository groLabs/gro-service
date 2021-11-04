"use strict";
const { BigNumber } = require('ethers');
const pendingTransactions = new Map();
const blockNumberTimestamp = [];
function getPendingSmallest() {
    const types = Array.from(pendingTransactions.keys());
    let smallestNonce = 0;
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        const transactionInfo = pendingTransactions.get(type);
        const { nonce } = transactionInfo.transactionRequest;
        if (smallestNonce === 0) {
            smallestNonce = nonce;
        }
        else if (BigNumber.from(nonce).lt(BigNumber.from(smallestNonce))) {
            smallestNonce = nonce;
        }
    }
    return smallestNonce;
}
function addPendingTransaction(typeKey, basicInfo, transactionResponse) {
    const { blockNumber, providerKey, walletKey, reSendTimes, methodName, label, } = basicInfo;
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
            gasLimit: transactionResponse.gasLimit.hex,
            to: transactionResponse.to,
            value: transactionResponse.value.hex,
            data: transactionResponse.data,
            chainId: transactionResponse.chainId,
            from: transactionResponse.from,
        },
    });
}
module.exports = {
    pendingTransactions,
    blockNumberTimestamp,
    getPendingSmallest,
    addPendingTransaction,
};
