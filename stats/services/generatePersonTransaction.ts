import { CONTRACT_ASSET_DECIMAL, div } from '../../common/digitalUtil';
import { getConfig } from '../../common/configUtil';
import { blockNumberTimestamp } from '../../common/storage';
const logger = require('../statsLogger');

const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;

async function getBlockNumberTimestamp(blockNumber, provider) {
    if (!blockNumberTimestamp[blockNumber]) {
        logger.info(`Append timestamp for blockNumber ${blockNumber}`);
        const blockObject = await provider.getBlock(blockNumber);
        blockNumberTimestamp[blockNumber] = `${blockObject.timestamp}`;
    }
    return blockNumberTimestamp[blockNumber];
}

async function fetchTimestamp(transaction, provider) {
    const blocknumber = transaction.block_number;
    transaction.timestamp = await getBlockNumberTimestamp(
        blocknumber,
        provider
    );
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
            coin_amount: div(
                event.coin_amount,
                CONTRACT_ASSET_DECIMAL,
                amountDecimal
            ),
            block_number: event.blockNumber,
        };
        if (event.name.indexOf('Transfer') > -1) {
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

async function appendEventTimestamp(transactions, provider) {
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(transactions[i], provider));
    }
    await Promise.all(promise);
}

async function getTransactions(groVault, powerD, provider) {
    const depositWithdrawTransferEvents = getDepositWithdrawTransfer(
        groVault,
        powerD
    );
    await appendEventTimestamp(depositWithdrawTransferEvents, provider);
    return depositWithdrawTransferEvents;
}

async function getTransaction(
    depositWithdrawTransferEvents,
    approvalEvents,
    failTransactions,
    provider
) {
    await appendEventTimestamp(approvalEvents, provider);
    const transactionItems = {
        deposits: [],
        withdrawals: [],
        transfers_in: [],
        transfers_out: [],
        approvals: [],
        failures: [],
    };
    for (let i = 0; i < depositWithdrawTransferEvents.length; i += 1) {
        const event = depositWithdrawTransferEvents[i];
        const {
            token,
            transaction,
            hash,
            usd_amount: usdAmount,
            block_number: blockNumber,
            coin_amount: coinAmount,
            timestamp,
        } = event;
        switch (transaction) {
            case 'deposit':
                transactionItems.deposits.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    coin_amount: coinAmount,
                    block_number: blockNumber,
                });
                break;
            case 'withdrawal':
                transactionItems.withdrawals.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    coin_amount: coinAmount,
                    block_number: blockNumber,
                });
                break;
            case 'transfer_in':
                transactionItems.transfers_in.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    coin_amount: coinAmount,
                    block_number: blockNumber,
                });
                break;
            case 'transfer_out':
                transactionItems.transfers_out.push({
                    token,
                    hash,
                    timestamp,
                    usd_amount: usdAmount,
                    coin_amount: coinAmount,
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

    for (let i = 0; i < failTransactions.length; i += 1) {
        const { contractName, hash, blockNumber, timeStamp, to } =
            failTransactions[i];
        transactionItems.failures.push({
            hash,
            contract_name: contractName,
            contract_address: to,
            timestamp: timeStamp,
            block_number: blockNumber,
        });
    }
    return transactionItems;
}
export {
    getTransactions,
    getTransaction,
    appendEventTimestamp,
};
