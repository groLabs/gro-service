const axios = require('axios');
const logger = require('../statsLogger');
const { getConfig } = require('../../common/configUtil');
const { getController } = require('../../contract/allContracts');

const apiKey = getConfig('etherscan_api_key');
const startBlock = getConfig('blockchain.start_block');
const runEnv = process.env.NODE_ENV;

let etherScanEndPoint;
if (runEnv === 'mainnet') {
    etherScanEndPoint = `https://api.etherscan.io/api?module=account&action=txlist&sort=asc&apikey=${apiKey}`;
} else {
    etherScanEndPoint = `https://api-${runEnv}.etherscan.io/api?module=account&action=txlist&sort=asc&apikey=${apiKey}`;
}

async function getDistAddresses() {
    const controller = getController();
    const gvtAddress = await controller.gvt();
    const pwrdAddress = await controller.pwrd();
    const depositHandlerAddress = await controller.depositHandler();
    const withdrawHandlerAddress = await controller.withdrawHandler();
    return {
        gvtAddress: gvtAddress.toLowerCase(),
        pwrdAddress: pwrdAddress.toLowerCase(),
        depositHandlerAddress: depositHandlerAddress.toLowerCase(),
        withdrawHandlerAddress: withdrawHandlerAddress.toLowerCase(),
    };
}

async function getTransactionsByAccount(accountAddress) {
    const endpoint = `${etherScanEndPoint}&address=${accountAddress}&startblock=${startBlock}&endblock=99999999`;
    let result = [];
    const res = await axios.get(endpoint).catch((error) => {
        logger.error(error);
    });
    if (res.data.status === '1') {
        result = res.data.result;
    } else {
        logger.error(`Get account ${accountAddress} transactions failed`);
    }
    return result;
}

async function getAccountFailTransactions(accountAddress) {
    const transactions = await getTransactionsByAccount(accountAddress);
    logger.info(`transactions: ${JSON.stringify(transactions)}`);
    const distAddresses = await getDistAddresses();
    const failedTransactions = [];
    for (let i = 0; i < transactions.length; i += 1) {
        const { to, isError } = transactions[i];
        if (isError === '1') {
            switch (to) {
                case distAddresses.gvtAddress:
                    transactions[i].contractName = 'GVT';
                    failedTransactions.push(transactions[i]);
                    break;
                case distAddresses.pwrdAddress:
                    transactions[i].contractName = 'PWRD';
                    failedTransactions.push(transactions[i]);
                    break;
                case distAddresses.depositHandlerAddress:
                    transactions[i].contractName = 'DepositHandler';
                    failedTransactions.push(transactions[i]);
                    break;
                case distAddresses.withdrawHandlerAddress:
                    transactions[i].contractName = 'WithdrawHandler';
                    failedTransactions.push(transactions[i]);
                    break;
                default:
            }
        }
    }
    return failedTransactions;
}

module.exports = {
    getAccountFailTransactions,
};
