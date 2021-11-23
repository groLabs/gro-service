"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractsHistory = exports.getLatestContractsAddressByAddress = exports.getLatestContractsAddress = exports.loadContractInfoFromRegistry = void 0;
const registry_1 = require("./registry");
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
let latestContractsAddress;
let latestContractsAddressByAddress;
let contractsHistory;
async function loadContractInfoFromRegistry() {
    latestContractsAddress = await (0, registry_1.getLatestContracts)(false);
    latestContractsAddressByAddress = await (0, registry_1.getLatestContracts)(true);
    contractsHistory = await (0, registry_1.getContractsHistory)();
    logger.info(`latestContractsAddress: ${JSON.stringify(latestContractsAddress)}`);
    logger.info(`latestContractsAddressByAddress: ${JSON.stringify(latestContractsAddressByAddress)}`);
    logger.info(`contractsHistory: ${JSON.stringify(contractsHistory)}`);
}
exports.loadContractInfoFromRegistry = loadContractInfoFromRegistry;
function getLatestContractsAddress() {
    return latestContractsAddress;
}
exports.getLatestContractsAddress = getLatestContractsAddress;
function getLatestContractsAddressByAddress() {
    return latestContractsAddressByAddress;
}
exports.getLatestContractsAddressByAddress = getLatestContractsAddressByAddress;
function getContractsHistory() {
    return contractsHistory;
}
exports.getContractsHistory = getContractsHistory;
