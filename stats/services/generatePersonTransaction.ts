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
    const blocknumber = transaction.blockNumber;
    transaction.timestamp = await getBlockNumberTimestamp(
        blocknumber,
        provider
    );
    return transaction;
}

function organizeTransactions(events, isApprovalEvent, token?) {
    const transactions = [];
    for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        const item = {
            token: token || event.token,
            spender: event.spender,
            timestamp: event.timestamp,
            hash: event.transactionHash,
            usd_amount: isApprovalEvent
                ? event.amount
                : div(event.amount, CONTRACT_ASSET_DECIMAL, amountDecimal),
            coin_amount: isApprovalEvent
                ? event.coin_amount
                : div(event.coin_amount, CONTRACT_ASSET_DECIMAL, amountDecimal),
            block_number: event.blockNumber.toString(),
        };
        transactions.push(item);
    }
    return transactions;
}

async function appendEventTimestamp(transactions, provider) {
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(transactions[i], provider));
    }
    await Promise.all(promise);
}

function organizeFailedTransactions(failTransactions) {
    const failedItems = [];
    for (let i = 0; i < failTransactions.length; i += 1) {
        const { contractName, hash, blockNumber, timeStamp, to } =
            failTransactions[i];
        failedItems.push({
            hash,
            contract_name: contractName,
            contract_address: to,
            timestamp: timeStamp,
            block_number: blockNumber,
        });
    }
    return failedItems;
}
export {
    appendEventTimestamp,
    organizeFailedTransactions,
    organizeTransactions,
};
