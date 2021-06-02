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
        } else if (BigNumber.from(nonce).lt(BigNumber.from(smallestNonce))) {
            smallestNonce = nonce;
        }
    }
    return smallestNonce;
}

function addPendingTransaction(typeKey, basicInfo, transactionResponse) {
    const { blockNumber, reSendTimes, methodName, label } = basicInfo;
    pendingTransactions.set(typeKey, {
        blockNumber,
        reSendTimes,
        methodName,
        label,
        hash: transactionResponse.hash,
        createdTime: new Date(),
        timestamp: Date.now(),
        transactionRequest: {
            nonce: transactionResponse.nonce,
            gasPrice: transactionResponse.gasPrice.hex,
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
