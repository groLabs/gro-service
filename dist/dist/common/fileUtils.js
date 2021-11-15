"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePendingTransaction = exports.readPendingTransaction = exports.updateLastBlockNumber = exports.getLastBlockNumber = void 0;
const fs_1 = __importDefault(require("fs"));
const configUtil_1 = require("./configUtil");
const blockNumberFile = (0, configUtil_1.getConfig)('blockNumberFile');
const pendingTransactionFile = (0, configUtil_1.getConfig)('pendingTransactionFile');
function getLastBlockNumber(type, default_value_key = 'blockchain.start_block') {
    const data = fs_1.default.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    return blockObj[type] || (0, configUtil_1.getConfig)(default_value_key);
}
exports.getLastBlockNumber = getLastBlockNumber;
function updateLastBlockNumber(blockNumber, type) {
    const data = fs_1.default.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    blockObj[type] = blockNumber + 1;
    fs_1.default.writeFileSync(blockNumberFile, JSON.stringify(blockObj));
}
exports.updateLastBlockNumber = updateLastBlockNumber;
function readPendingTransaction() {
    const pendingTransaction = fs_1.default.readFileSync(pendingTransactionFile, {
        flag: 'a+',
    });
    const content = pendingTransaction.toString();
    let pendingTransactionObj;
    if (content.length === 0) {
        pendingTransactionObj = new Map();
    }
    else {
        pendingTransactionObj = new Map(JSON.parse(content));
    }
    console.log(pendingTransactionObj);
    return pendingTransactionObj;
}
exports.readPendingTransaction = readPendingTransaction;
function updatePendingTransaction(pendingTransactions) {
    console.log(`updatePendingTransaction ${JSON.stringify([...pendingTransactions])}`);
    fs_1.default.writeFileSync(pendingTransactionFile, JSON.stringify([...pendingTransactions]));
}
exports.updatePendingTransaction = updatePendingTransaction;
