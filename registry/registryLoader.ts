import fs from 'fs';
import {
    getLatestContracts,
    getContractsHistory as getHistory,
} from './registry';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

let latestContractsAddress;
let latestContractsAddressByAddress;
let contractsHistory;

async function loadContractInfoFromRegistry() {
    try {
        latestContractsAddress = await getLatestContracts(false);
        latestContractsAddressByAddress = await getLatestContracts(true);
        contractsHistory = await getHistory();
    } catch (error) {
        logger.error(error);
        const localInfo = readLocalContractConfig();
        latestContractsAddress = localInfo.latestContractsAddress;
        latestContractsAddressByAddress =
            localInfo.latestContractsAddressByAddress;
        contractsHistory = localInfo.contractsHistory;
    }

    logger.info(
        `latestContractsAddress: ${JSON.stringify(latestContractsAddress)}`
    );
    logger.info(
        `latestContractsAddressByAddress: ${JSON.stringify(
            latestContractsAddressByAddress
        )}`
    );
    logger.info(`contractsHistory: ${JSON.stringify(contractsHistory)}`);
}

function getLatestContractsAddress() {
    return latestContractsAddress;
}

function getLatestContractsAddressByAddress() {
    return latestContractsAddressByAddress;
}

function getContractsHistory() {
    return contractsHistory;
}

function readLocalContractConfig() {
    const configFileFolder = `${__dirname}/config`;
    const filePath = `${configFileFolder}/${process.env.NODE_ENV}_contracts_history.json`;
    const data = fs.readFileSync(filePath, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const contractsHistory = JSON.parse(content);
    logger.info(
        `local ${
            process.env.NODE_ENV
        } contracts history : ${filePath}:\n${JSON.stringify(contractsHistory)}`
    );

    const contractNames = Object.keys(contractsHistory);
    logger.info(`contractNames: ${JSON.stringify(contractNames)}`);
    const latestContractsAddress = {};
    const latestContractsAddressByAddress = {};
    for (let i = 0; i < contractNames.length; i += 1) {
        const contractName = contractNames[i];
        const contractHistory = contractsHistory[contractName];
        const latestContractInfo = contractHistory[contractHistory.length - 1];
        const contractAddress = latestContractInfo.address;
        latestContractsAddress[contractName] = latestContractInfo;
        latestContractsAddressByAddress[contractAddress] = latestContractInfo;
    }

    return {
        latestContractsAddress,
        latestContractsAddressByAddress,
        contractsHistory,
    };
}

export {
    loadContractInfoFromRegistry,
    getLatestContractsAddress,
    getLatestContractsAddressByAddress,
    getContractsHistory,
};
