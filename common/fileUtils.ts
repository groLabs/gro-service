import fs from 'fs';
import { getConfig } from './configUtil';

const blockNumberFile = getConfig('blockNumberFile') as string;
const pendingTransactionFile = getConfig('pendingTransactionFile') as string;

function getLastBlockNumber(
    type,
    default_value_key = 'blockchain.start_block'
) {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    return blockObj[type] || getConfig(default_value_key);
}

function updateLastBlockNumber(blockNumber, type) {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    blockObj[type] = blockNumber + 1;
    fs.writeFileSync(blockNumberFile, JSON.stringify(blockObj));
}

function readPendingTransaction() {
    const pendingTransaction = fs.readFileSync(pendingTransactionFile, {
        flag: 'a+',
    });
    const content = pendingTransaction.toString();
    let pendingTransactionObj;
    if (content.length === 0) {
        pendingTransactionObj = new Map();
    } else {
        pendingTransactionObj = new Map(JSON.parse(content));
    }
    console.log(pendingTransactionObj);
    return pendingTransactionObj;
}

function updatePendingTransaction(pendingTransactions) {
    console.log(
        `updatePendingTransaction ${JSON.stringify([...pendingTransactions])}`
    );
    fs.writeFileSync(
        pendingTransactionFile,
        JSON.stringify([...pendingTransactions])
    );
}

export {
    getLastBlockNumber,
    updateLastBlockNumber,
    readPendingTransaction,
    updatePendingTransaction,
};
