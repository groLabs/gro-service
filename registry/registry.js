const { ethers } = require('ethers');
const { getConfig } = require('../common/configUtil');
const { getAlchemyRpcProvider } = require('../common/chainUtil');
const { SettingError } = require('../common/error');
const registryABI = require('./Registry.json');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const registryAddress = getConfig('registry_address', false);
const provider = getAlchemyRpcProvider();

const registry = new ethers.Contract(registryAddress, registryABI, provider);
const activeContractNames = [];

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
};

const ContractABIMapping = {};
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

async function getActiveContractNames() {
    if (!activeContractNames.length) {
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

    return activeContractNames;
}

async function checkContractNameConfiguration() {
    const configContractNames = Object.keys(ContractABIMapping);
    const registryAllContractNames = await getActiveContractNames();
    for (let i = 0; i < registryAllContractNames.length; i += 1) {
        const name = registryAllContractNames[i];
        if (!configContractNames.includes(name)) {
            throw new SettingError(`Not fund contract key: ${name}`);
        }
    }
    logger.info(`contract name: ${JSON.stringify(registryAllContractNames)}`);
}

async function getActiveContractInfoByName(contractName) {
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

    const latestStartBlock =
        contractInfo.startBlock[contractInfo.startBlock.length - 1];
    return {
        address: contractAddress,
        deployedBlock: parseInt(`${contractInfo.deployedBlock}`, 10),
        startBlock: parseInt(`${latestStartBlock}`, 10),
        abiVersion: contractInfo.abiVersion,
        tag: contractInfo.tag,
        metaData: contractInfo.metaData,
        active: contractInfo.active,
    };
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
    const info = await registry.getContractData(address).catch((error) => {
        logger.error(error);
        return {};
    });
    const result = [];
    if (info.startBlock) {
        for (let i = 0; i < info.startBlock.length; i += 1) {
            result.push({
                address,
                deployedBlock: parseInt(`${info.deployedBlock}`, 10),
                startBlock: parseInt(`${info.startBlock[i]}`, 10),
                endBlock: parseInt(`${info.endBlock[i]}`, 10),
                abiVersion: info.abiVersion,
                tag: info.tag,
                metaData: info.metaData,
                active: info.active,
            });
        }
    }
    return result;
}

async function getContractHistory(contractName) {
    const contracts = await getContracts(contractName);
    const resultPromise = [];
    for (let i = 0; i < contracts.length; i += 1) {
        resultPromise.push(getContractInfoByAddress(contracts[i]));
    }
    const result = await Promise.all(resultPromise);
    const contractHistory = [];
    for (let i = 0; i < result.length; i += 1) {
        contractHistory.push(...result[i]);
    }
    logger.info(`${contractName}: ${JSON.stringify(contractHistory)}`);
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
        } else {
            contracts[contractNames[i]] = result[i];
        }
    }
    return contracts;
}

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

module.exports = {
    ContractNames,
    ContractABIMapping,
    getLatestContracts,
    getContractsHistory,
    checkContractNameConfiguration,
};
