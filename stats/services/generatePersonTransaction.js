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

function getDepositWithdrawTransfer(groVault, powerD) {
    const groDepositEvents = groVault.deposit;
    const groWithdrawEvents = groVault.withdraw;
    const pwrdDepositEvents = powerD.deposit;
    const pwrdWithdrawEvents = powerD.withdraw;

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

async function appendEventTimestamp(transactions) {
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(transactions[i]));
    }
    await Promise.all(promise);
}

async function getTransactions(groVault, powerD) {
    const depositWithdrawTransferEvents = getDepositWithdrawTransfer(
        groVault,
        powerD
    );
    await appendEventTimestamp(depositWithdrawTransferEvents);
    return depositWithdrawTransferEvents;
}

async function getTransaction(depositWithdrawTransferEvents, approvalEvents) {
    await appendEventTimestamp(approvalEvents);
    const transactionItems = {
        deposits: [],
        withdrawals: [],
        transfers_in: [],
        transfers_out: [],
        approvals: [],
    };
    for (let i = 0; i < depositWithdrawTransferEvents.length; i += 1) {
        const event = depositWithdrawTransferEvents[i];
        const {
            token,
            transaction,
            hash,
            usd_amount: usdAmount,
            block_number: blockNumber,
            timestamp,
        } = event;
        switch (transaction) {
            case 'deposit':
                transactionItems.deposits.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    block_number: blockNumber,
                });
                break;
            case 'withdrawal':
                transactionItems.withdrawals.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    block_number: blockNumber,
                });
                break;
            case 'transfer_in':
                transactionItems.transfers_in.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    block_number: blockNumber,
                });
                break;
            case 'transfer_out':
                transactionItems.transfers_out.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    block_number: blockNumber,
                });
                break;
            default:
                logger.warn(`${transaction} doesn't have any matched.`);
        }
    }

    for (let i = 0; i < approvalEvents.length; i += 1) {
        const {
            token,
            hash,
            spender,
            coin_amount: coinAmount,
            usd_amount: usdAmount,
            block_number: blockNumber,
            timestamp,
        } = approvalEvents[i];
        transactionItems.approvals.push({
            token,
            hash,
            spender,
            timestamp,
            coin_amount: coinAmount,
            usd_amount: usdAmount,
            block_number: blockNumber,
        });
    }
    return transactionItems;
}
module.exports = {
    getTransactions,
    getTransaction,
};
