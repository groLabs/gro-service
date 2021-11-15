import { getLatestContracts, getContractsHistory as getHistory } from './registry';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

let latestContractsAddress;
let latestContractsAddressByAddress;
let contractsHistory;

async function loadContractInfoFromRegistry() {
    latestContractsAddress = await getLatestContracts(false);
    latestContractsAddressByAddress = await getLatestContracts(true);
    contractsHistory = await getHistory();
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

export {
    loadContractInfoFromRegistry,
    getLatestContractsAddress,
    getLatestContractsAddressByAddress,
    getContractsHistory,
};
