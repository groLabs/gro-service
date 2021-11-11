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
module.exports = {
    pendingTransactions,
    blockNumberTimestamp,
    getPendingSmallest,
};
