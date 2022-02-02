"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkContractNameConfiguration = exports.getContractsHistory = exports.getLatestContracts = exports.readLocalContractConfig = exports.ContractABIMapping = exports.ContractNames = void 0;
const fs_1 = __importDefault(require("fs"));
const ethers_1 = require("ethers");
const configUtil_1 = require("../common/configUtil");
const chainUtil_1 = require("../common/chainUtil");
const error_1 = require("../common/error");
const registryABI = require('./Registry.json');
const erc20ABI = require('../abi/ERC20.json');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const configFileFolder = `${__dirname}/config`;
const registryAddress = (0, configUtil_1.getConfig)('registry_address', false);
const provider = (0, chainUtil_1.getAlchemyRpcProvider)();
let registry;
if (registryAddress) {
    registry = new ethers_1.ethers.Contract(registryAddress, registryABI, provider);
}
const activeContractNames = [];
let localContractConfig;
const ContractNames = {
    groVault: 'GroVault',
    powerD: 'PowerDollar',
    depositHandler: 'DepositHandler',
    withdrawHandler: 'WithdrawHandler',
    emergencyHandler: 'EmergencyHandler',
    controller: 'Controller',
    pnl: 'PnL',
    insurance: 'Insurance',
    exposure: 'Exposure',
    allocation: 'Allocation',
    buoy3Pool: 'Buoy3Pool',
    lifeguard: 'Lifeguard',
    DAIVault: 'DAIVault',
    DAIVaultAdaptor: 'DAIVaultAdaptor',
    DAIPrimary: 'DAIPrimary',
    DAISecondary: 'DAISecondary',
    USDCVault: 'USDCVault',
    USDCVaultAdaptor: 'USDCVaultAdaptor',
    USDCPrimary: 'USDCPrimary',
    USDCSecondary: 'USDCSecondary',
    USDTVault: 'USDTVault',
    USDTVaultAdaptor: 'USDTVaultAdaptor',
    USDTPrimary: 'USDTPrimary',
    USDTSecondary: 'USDTSecondary',
    CRVVault: '3CRVVault',
    CRVVaultAdaptor: '3CRVVaultAdaptor',
    CRVPrimary: '3CrvPrimary',
    BalancerWeightedPool: 'BalancerWeightedPool',
    TokenCounter: 'TokenCounter',
    GroDAO: 'GroDAO',
    AVAXDAIVault: 'AVAXDAIVault',
    AVAXUSDCVault: 'AVAXUSDCVault',
    AVAXUSDTVault: 'AVAXUSDTVault',
};
exports.ContractNames = ContractNames;
const ContractABIMapping = {};
exports.ContractABIMapping = ContractABIMapping;
ContractABIMapping[ContractNames.groVault] = 'NonRebasingGToken';
ContractABIMapping[ContractNames.powerD] = 'RebasingGToken';
ContractABIMapping[ContractNames.depositHandler] = 'DepositHandler';
ContractABIMapping[ContractNames.withdrawHandler] = 'WithdrawHandler';
ContractABIMapping[ContractNames.emergencyHandler] = 'EmergencyHandler';
ContractABIMapping[ContractNames.controller] = 'Controller';
ContractABIMapping[ContractNames.pnl] = 'PnL';
ContractABIMapping[ContractNames.insurance] = 'Insurance';
ContractABIMapping[ContractNames.exposure] = 'Exposure';
ContractABIMapping[ContractNames.allocation] = 'Allocation';
ContractABIMapping[ContractNames.buoy3Pool] = 'Buoy3Pool';
ContractABIMapping[ContractNames.lifeguard] = 'LifeGuard3Pool';
ContractABIMapping[ContractNames.DAIVault] = 'Vault';
ContractABIMapping[ContractNames.DAIVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.DAIPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.DAISecondary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDCVault] = 'Vault';
ContractABIMapping[ContractNames.USDCVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.USDCPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDCSecondary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDTVault] = 'Vault';
ContractABIMapping[ContractNames.USDTVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.USDTPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDTSecondary] = 'BaseStrategy';
ContractABIMapping[ContractNames.CRVVault] = 'Vault';
ContractABIMapping[ContractNames.CRVVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.CRVPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.BalancerWeightedPool] = 'BalancerWeightedPool';
ContractABIMapping[ContractNames.TokenCounter] = 'TokenCounter';
ContractABIMapping[ContractNames.GroDAO] = 'GroDAOVesting';
ContractABIMapping[ContractNames.AVAXDAIVault] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault] = 'VaultAdaptorMK2';
function readLocalContractConfig(isReload = false) {
    if (isReload || !localContractConfig) {
        const filePath = `${configFileFolder}/${process.env.NODE_ENV}_contractConfig.json`;
        const data = fs_1.default.readFileSync(filePath, { flag: 'a+' });
        let content = data.toString();
        if (content.length === 0) {
            content = '{}';
        }
        localContractConfig = JSON.parse(content);
        logger.info(`Load config file from : ${filePath}:\n${JSON.stringify(localContractConfig)}`);
    }
    return localContractConfig;
}
exports.readLocalContractConfig = readLocalContractConfig;
async function getActiveContractNames() {
    if (!activeContractNames.length) {
        const localConfig = readLocalContractConfig();
        if (localConfig.contractNames) {
            activeContractNames.push(...localConfig.contractNames);
        }
        else {
            const result = await registry.getKeys().catch((error) => {
                logger.error(error);
                return [];
            });
            for (let i = 0; i < result.length; i += 1) {
                if (result[i] !== '') {
                    activeContractNames.push(result[i]);
                }
            }
        }
    }
    return activeContractNames;
}
async function checkContractNameConfiguration() {
    const configContractNames = Object.keys(ContractABIMapping);
    const registryAllContractNames = await getActiveContractNames();
    for (let i = 0; i < registryAllContractNames.length; i += 1) {
        const name = registryAllContractNames[i];
        if (!configContractNames.includes(name)) {
            throw new error_1.SettingError(`Not fund contract key: ${name}`);
        }
    }
    logger.info(`contract name: ${JSON.stringify(registryAllContractNames)}`);
}
exports.checkContractNameConfiguration = checkContractNameConfiguration;
async function parseProtocolExposure(protocols, metaData) {
    const protocolsDisplayName = [];
    const protocolsName = [];
    for (let i = 0; i < protocols.length; i += 1) {
        const protocolIndex = parseInt(`${protocols[i]}`, 10);
        // eslint-disable-next-line no-await-in-loop
        const protocolName = await registry
            .getProtocol(protocols[i])
            .catch((error) => {
            logger.error(error);
            return '';
        });
        protocolsName.push(protocolName);
        if (metaData.PDN && metaData.PDN[protocolIndex]) {
            protocolsDisplayName.push(metaData.PDN[protocolIndex]);
        }
        else {
            protocolsDisplayName.push(protocolName);
        }
    }
    return { protocolsDisplayName, protocolsName };
}
async function parseTokenExposure(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const tokenAddress = await registry
            .getToken(tokens[i])
            .catch((error) => {
            logger.error(error);
        });
        let tokenSymbol = '';
        if (tokenAddress) {
            const token = new ethers_1.ethers.Contract(tokenAddress, erc20ABI, provider);
            // eslint-disable-next-line no-await-in-loop
            tokenSymbol = await token.symbol().catch((error) => {
                logger.error(error);
                return '';
            });
        }
        result.push(tokenSymbol);
    }
    return result;
}
async function getActiveContractInfoByName(contractName) {
    const localConfig = readLocalContractConfig();
    let result = {};
    if (localConfig.latestContracts &&
        localConfig.latestContracts[contractName]) {
        result = localConfig.latestContracts[contractName];
    }
    else {
        const contractAddress = await registry
            .getActive(contractName)
            .catch((error) => {
            throw error;
        });
        const contractInfo = await registry
            .getActiveData(contractName)
            .catch((error) => {
            throw error;
        });
        const latestStartBlock = contractInfo.startBlock[contractInfo.startBlock.length - 1];
        const metaData = contractInfo.metaData.trim().length
            ? contractInfo.metaData
            : '{}';
        const metaDataObject = JSON.parse(metaData);
        const protocolInfo = await parseProtocolExposure(contractInfo.protocols, metaDataObject);
        const tokenNames = await parseTokenExposure(contractInfo.tokens);
        result = {
            address: contractAddress,
            deployedBlock: parseInt(`${contractInfo.deployedBlock}`, 10),
            startBlock: parseInt(`${latestStartBlock}`, 10),
            abiVersion: contractInfo.abiVersion,
            tag: contractInfo.tag,
            tokens: tokenNames,
            protocols: protocolInfo.protocolsName,
            protocolsDisplayName: protocolInfo.protocolsDisplayName,
            metaData: metaDataObject,
            active: contractInfo.active,
        };
    }
    return result;
}
async function getContracts(contractName) {
    const addresses = await registry
        .getContractMap(contractName)
        .catch((error) => {
        logger.error(error);
        return [];
    });
    return addresses;
}
async function getContractInfoByAddress(address) {
    const localConfig = readLocalContractConfig();
    const result = [];
    if (localConfig.contractInfo && localConfig.contractInfo[address]) {
        result.push(...localConfig.contractInfo[address]);
    }
    else {
        const info = await registry.getContractData(address).catch((error) => {
            logger.error(error);
            return {};
        });
        const metaData = info.metaData.trim().length ? info.metaData : '{}';
        const metaDataObject = JSON.parse(metaData);
        const protocolInfo = await parseProtocolExposure(info.protocols, metaDataObject);
        const tokenNames = await parseTokenExposure(info.tokens);
        if (info.startBlock) {
            for (let i = 0; i < info.startBlock.length; i += 1) {
                result.push({
                    address,
                    deployedBlock: parseInt(`${info.deployedBlock}`, 10),
                    startBlock: parseInt(`${info.startBlock[i]}`, 10),
                    endBlock: parseInt(`${info.endBlock[i]}`, 10),
                    abiVersion: info.abiVersion,
                    tag: info.tag,
                    tokens: tokenNames,
                    protocols: protocolInfo.protocolsName,
                    protocolsDisplayName: protocolInfo.protocolsDisplayName,
                    metaData: metaDataObject,
                    active: info.active,
                });
            }
        }
    }
    return result;
}
async function getContractHistory(contractName) {
    const localConfig = readLocalContractConfig();
    let contractHistory = [];
    if (localConfig.contractHistories &&
        localConfig.contractHistories[contractName]) {
        contractHistory = localConfig.contractHistories[contractName];
    }
    else {
        const contracts = await getContracts(contractName);
        const resultPromise = [];
        for (let i = 0; i < contracts.length; i += 1) {
            resultPromise.push(getContractInfoByAddress(contracts[i]));
        }
        const result = await Promise.all(resultPromise);
        for (let i = 0; i < result.length; i += 1) {
            contractHistory.push(...result[i]);
        }
    }
    return contractHistory;
}
async function getLatestContracts(isByAddress = false) {
    const contractNames = await getActiveContractNames();
    const resultPromise = [];
    for (let i = 0; i < contractNames.length; i += 1) {
        resultPromise.push(getActiveContractInfoByName(contractNames[i]));
    }
    const result = await Promise.all(resultPromise);
    const contracts = {};
    for (let i = 0; i < contractNames.length; i += 1) {
        if (isByAddress) {
            result[i].contractName = contractNames[i];
            contracts[result[i].address] = result[i];
        }
        else {
            contracts[contractNames[i]] = result[i];
        }
    }
    return contracts;
}
exports.getLatestContracts = getLatestContracts;
async function getContractsHistory() {
    const contractNames = await getActiveContractNames();
    logger.info(`contractNames: ${JSON.stringify(contractNames)}`);
    const resultPromise = [];
    for (let i = 0; i < contractNames.length; i += 1) {
        resultPromise.push(getContractHistory(contractNames[i]));
    }
    const result = await Promise.all(resultPromise);
    const contractsHistory = {};
    for (let i = 0; i < contractNames.length; i += 1) {
        contractsHistory[contractNames[i]] = result[i];
    }
    return contractsHistory;
}
exports.getContractsHistory = getContractsHistory;