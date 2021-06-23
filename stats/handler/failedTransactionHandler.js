const axios = require('axios');
const logger = require('../statsLogger');
const { getConfig } = require('../../common/configUtil');
const { getController } = require('../../contract/allContracts');

const apiKey = getConfig('etherscan_api_key');
const startBlock = getConfig('blockchain.start_block');
const depositHandlerHistory = getConfig('deposit_handler_history', false) || {};
const withdrawHandlerHistory =
    getConfig('withdraw_handler_history', false) || {};
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
    const depositHandlerAddresses = [];
    const withdrawHandlerAddresses = [];

    const depositHandlers = Object.keys(depositHandlerHistory);
    if (depositHandlers.length > 0) {
        for (let i = 0; i < depositHandlers.length; i += 1) {
            depositHandlerAddresses.push(depositHandlers[i].toLowerCase());
        }
    } else {
        const depositHandlerAddress = await controller.depositHandler();
        depositHandlerAddresses.push(depositHandlerAddress.toLowerCase());
    }
    const withdrawHandlers = Object.keys(withdrawHandlerHistory);
    if (withdrawHandlers.length > 0) {
        for (let i = 0; i < withdrawHandlers.length; i += 1) {
            withdrawHandlerAddresses.push(withdrawHandlers[i].toLowerCase());
        }
    } else {
        const withdrawHandlerAddress = await controller.withdrawHandler();
        withdrawHandlerAddresses.push(withdrawHandlerAddress.toLowerCase());
    }

    return {
        withdrawHandlerAddresses,
        depositHandlerAddresses,
        gvtAddress: gvtAddress.toLowerCase(),
        pwrdAddress: pwrdAddress.toLowerCase(),
    };
}

async function getTransactionsByAccount(accountAddress) {
    const endpoint = `${etherScanEndPoint}&address=${accountAddress}&startblock=${startBlock}&endblock=99999999`;
    let result = [];
    const res = await axios.get(endpoint).catch((error) => {
        logger.error(error);
    });
    if (res && res.data.status === '1') {
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
            if (to === distAddresses.gvtAddress) {
                transactions[i].contractName = 'GVT';
                failedTransactions.push(transactions[i]);
            } else if (to === distAddresses.pwrdAddress) {
                transactions[i].contractName = 'PWRD';
                failedTransactions.push(transactions[i]);
            } else if (distAddresses.withdrawHandlerAddresses.includes(to)) {
                transactions[i].contractName = 'WithdrawHandler';
                failedTransactions.push(transactions[i]);
            } else if (distAddresses.depositHandlerAddresses.includes(to)) {
                transactions[i].contractName = 'DepositHandler';
                failedTransactions.push(transactions[i]);
            }
        }
    }
    return failedTransactions;
}

module.exports = {
    getAccountFailTransactions,
};
