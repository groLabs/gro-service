const axios = require('axios');
const logger = require('../statsLogger');
const { getConfig } = require('../../common/configUtil');
const { getContractsHistory } = require('../../registry/registryLoader');
const { ContractNames } = require('../../registry/registry');

const apiKey = getConfig('etherscan_api_key');
const startBlock = getConfig('blockchain.start_block');
const runEnv = process.env.NODE_ENV;

let etherScanEndPoint;
if (runEnv === 'mainnet') {
    etherScanEndPoint = `https://api.etherscan.io/api?module=account&action=txlist&sort=asc&apikey=${apiKey}`;
} else {
    etherScanEndPoint = `https://api-${runEnv}.etherscan.io/api?module=account&action=txlist&sort=asc&apikey=${apiKey}`;
}

function getDistAddresses() {
    const gvtAddresses = [];
    const pwrdAddresses = [];
    const depositHandlerAddresses = [];
    const withdrawHandlerAddresses = [];

    const contractsHistory = getContractsHistory();

    const gvtHistory = contractsHistory[ContractNames.groVault];
    for (let i = 0; i < gvtHistory.length; i += 1) {
        gvtAddresses.push(gvtHistory[i].address.toLowerCase());
    }

    const pwrdHistory = contractsHistory[ContractNames.powerD];
    for (let i = 0; i < pwrdHistory.length; i += 1) {
        pwrdAddresses.push(pwrdHistory[i].address.toLowerCase());
    }

    const depositHandlerHistory =
        contractsHistory[ContractNames.depositHandler];
    for (let i = 0; i < depositHandlerHistory.length; i += 1) {
        depositHandlerAddresses.push(
            depositHandlerHistory[i].address.toLowerCase()
        );
    }

    const withdrawHandlerHistory =
        contractsHistory[ContractNames.withdrawHandler];
    for (let i = 0; i < withdrawHandlerHistory.length; i += 1) {
        withdrawHandlerAddresses.push(
            withdrawHandlerHistory[i].address.toLowerCase()
        );
    }
    return {
        gvtAddresses,
        pwrdAddresses,
        withdrawHandlerAddresses,
        depositHandlerAddresses,
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
    } else if (res && res.data.status === '0') {
        logger.info(
            `Not found account ${accountAddress}'s transactions for ${res.data.message} `
        );
    } else {
        logger.error(`Get account ${accountAddress} transactions failed.`);
    }
    return result;
}

async function getAccountFailTransactions(accountAddress) {
    const transactions = await getTransactionsByAccount(accountAddress);
    const {
        gvtAddresses,
        pwrdAddresses,
        withdrawHandlerAddresses,
        depositHandlerAddresses,
    } = getDistAddresses();
    const failedTransactions = [];
    for (let i = 0; i < transactions.length; i += 1) {
        const { to, isError } = transactions[i];
        if (isError === '1') {
            if (gvtAddresses.includes(to)) {
                transactions[i].contractName = 'GVT';
                failedTransactions.push(transactions[i]);
            } else if (pwrdAddresses.includes(to)) {
                transactions[i].contractName = 'PWRD';
                failedTransactions.push(transactions[i]);
            } else if (withdrawHandlerAddresses.includes(to)) {
                transactions[i].contractName = 'WithdrawHandler';
                failedTransactions.push(transactions[i]);
            } else if (depositHandlerAddresses.includes(to)) {
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
