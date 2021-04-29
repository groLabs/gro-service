const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const { getConfig } = require('../../common/configUtil');
const { blockNumberTimestamp } = require('../../common/storage');
const { getDefaultProvider } = require('../../common/chainUtil');
const logger = require('../statsLogger');

const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;

async function getBlockNumberTimestamp(blockNumber) {
    if (!blockNumberTimestamp[blockNumber]) {
        logger.info(`Not found timestamp for blockNumber ${blockNumber}`);
        const blockObject = await getDefaultProvider().getBlock(blockNumber);
        blockNumberTimestamp[blockNumber] = `${blockObject.timestamp}`;
    }
    return blockNumberTimestamp[blockNumber];
}

async function fetchTimestamp(transaction) {
    const blocknumber = transaction.block_number;
    transaction.timestamp = await getBlockNumberTimestamp(blocknumber);
    transaction.block_number = `${blocknumber}`;
    logger.info(`transaction: ${JSON.stringify(transaction)}`);
    return transaction;
}

function parseData(events, token, type, transferType) {
    const transactions = [];
    for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        const item = {
            token,
            transaction: type,
            hash: event.transactionHash,
            usd_amount: div(
                event.amount,
                CONTRACT_ASSET_DECIMAL,
                amountDecimal
            ),
            block_number: event.blockNumber,
        };
        if (event.name === 'LogTransfer') {
            item.transaction = transferType;
        }
        transactions.push(item);
    }
    return transactions;
}

function getTransactions(data) {
    const groDepositEvents = data.groVault.deposit;
    const groWithdrawEvents = data.groVault.withdraw;
    const pwrdDepositEvents = data.powerD.deposit;
    const pwrdWithdrawEvents = data.powerD.withdraw;

    const groDepositTransactions = parseData(
        groDepositEvents,
        'gvt',
        'deposit',
        'transfer_in'
    );

    const groWithdrawTransactions = parseData(
        groWithdrawEvents,
        'gvt',
        'withdrawal',
        'transfer_out'
    );

    const pwrdDepositTransactions = parseData(
        pwrdDepositEvents,
        'pwrd',
        'deposit',
        'transfer_in'
    );

    const pwrdWithdrawTransactions = parseData(
        pwrdWithdrawEvents,
        'pwrd',
        'withdrawal',
        'transfer_out'
    );
    return [
        ...groDepositTransactions,
        ...groWithdrawTransactions,
        ...pwrdDepositTransactions,
        ...pwrdWithdrawTransactions,
    ];
}

async function getTransactionsWithTimestamp(data) {
    const transactions = getTransactions(data);
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(transactions[i]));
    }
    await Promise.all(promise);
    return transactions;
}

module.exports = {
    getTransactions,
    getTransactionsWithTimestamp,
};
