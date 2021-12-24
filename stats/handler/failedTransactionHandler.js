const axios = require('axios');
const logger = require('../statsLogger');
const { getConfig } = require('../../dist/common/configUtil');
const {
    getContractsHistory,
    getLatestContractsAddress,
} = require('../../dist/registry/registryLoader');
const { ContractNames } = require('../../dist/registry/registry');

const apiKey = getConfig('etherscan_api_key');
const startBlock = getConfig('blockchain.start_block');
const avaxStartBlock = getConfig('blockchain.avax_start_block');
const runEnv = process.env.NODE_ENV;

let etherScanEndPoint;
const snowtraceEndPoint =
    'https://api.snowtrace.io/api?module=account&action=txlist&sort=asc&apikey=YourApiKeyToken';

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

function getDistAddressesOnAVAX() {
    const latestContracts = getLatestContractsAddress();

    const daiVault = latestContracts[ContractNames.AVAXDAIVault];
    const usdcVault = latestContracts[ContractNames.AVAXUSDCVault];
    const usdtVault = latestContracts[ContractNames.AVAXUSDTVault];
    const daiVault_v1_5 = latestContracts[ContractNames.AVAXDAIVault_v1_5];
    const usdcVault_v1_5 = latestContracts[ContractNames.AVAXUSDCVault_v1_5];
    const usdtVault_v1_5 = latestContracts[ContractNames.AVAXUSDTVault_v1_5];
    const daiVault_v1_5_1 = latestContracts[ContractNames.AVAXDAIVault_v1_5_1];
    const usdcVault_v1_5_1 =
        latestContracts[ContractNames.AVAXUSDCVault_v1_5_1];
    const usdtVault_v1_5_1 =
        latestContracts[ContractNames.AVAXUSDTVault_v1_5_1];

    return {
        daiVaultAddresses: daiVault.address.toLowerCase(),
        usdcVaultAddresses: usdcVault.address.toLowerCase(),
        usdtVaultAddresses: usdtVault.address.toLowerCase(),
        daiVaultAddresses_v1_5: daiVault_v1_5.address.toLowerCase(),
        usdcVaultAddresses_v1_5: usdcVault_v1_5.address.toLowerCase(),
        usdtVaultAddresses_v1_5: usdtVault_v1_5.address.toLowerCase(),
        daiVaultAddresses_v1_5_1: daiVault_v1_5_1.address.toLowerCase(),
        usdcVaultAddresses_v1_5_1: usdcVault_v1_5_1.address.toLowerCase(),
        usdtVaultAddresses_v1_5_1: usdtVault_v1_5_1.address.toLowerCase(),
    };
}

async function getTransactionsByAccount(accountAddress, network) {
    let endpoint;
    if (network === 'AVAX') {
        endpoint = `${snowtraceEndPoint}&address=${accountAddress}&startblock=${avaxStartBlock}&endblock=99999999`;
    } else {
        endpoint = `${etherScanEndPoint}&address=${accountAddress}&startblock=${startBlock}&endblock=99999999`;
    }
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

async function getAccountFailTransactionsOnAVAX(accountAddress) {
    const transactions = await getTransactionsByAccount(accountAddress, 'AVAX');
    const {
        daiVaultAddresses,
        usdcVaultAddresses,
        usdtVaultAddresses,
        daiVaultAddresses_v1_5,
        usdcVaultAddresses_v1_5,
        usdtVaultAddresses_v1_5,
        daiVaultAddresses_v1_5_1,
        usdcVaultAddresses_v1_5_1,
        usdtVaultAddresses_v1_5_1,
    } = getDistAddressesOnAVAX();
    const failedTransactions = [];
    for (let i = 0; i < transactions.length; i += 1) {
        const { to, isError } = transactions[i];
        if (isError === '1') {
            if (daiVaultAddresses.includes(to)) {
                transactions[i].contractName = 'DAIVaultMK2';
                failedTransactions.push(transactions[i]);
            } else if (usdcVaultAddresses.includes(to)) {
                transactions[i].contractName = 'USDCVaultMK2';
                failedTransactions.push(transactions[i]);
            } else if (usdtVaultAddresses.includes(to)) {
                transactions[i].contractName = 'USDTVaultMK2';
                failedTransactions.push(transactions[i]);
            } else if (daiVaultAddresses_v1_5.includes(to)) {
                transactions[i].contractName = 'DAIVaultMK2_v1_5';
                failedTransactions.push(transactions[i]);
            } else if (usdcVaultAddresses_v1_5.includes(to)) {
                transactions[i].contractName = 'USDCVaultMK2_v1_5';
                failedTransactions.push(transactions[i]);
            } else if (usdtVaultAddresses_v1_5.includes(to)) {
                transactions[i].contractName = 'USDTVaultMK2_v1_5';
                failedTransactions.push(transactions[i]);
            } else if (daiVaultAddresses_v1_5_1.includes(to)) {
                transactions[i].contractName = 'DAIVaultMK2_v1_5_1';
                failedTransactions.push(transactions[i]);
            } else if (usdcVaultAddresses_v1_5_1.includes(to)) {
                transactions[i].contractName = 'USDCVaultMK2_v1_5_1';
                failedTransactions.push(transactions[i]);
            } else if (usdtVaultAddresses_v1_5_1.includes(to)) {
                transactions[i].contractName = 'USDTVaultMK2_v1_5_1';
                failedTransactions.push(transactions[i]);
            }
        }
    }
    return failedTransactions;
}

module.exports = {
    getAccountFailTransactions,
    getAccountFailTransactionsOnAVAX,
};
