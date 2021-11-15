"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSystemLatestVaultStrategyContracts = exports.newSystemLatestContracts = exports.newLatestContract = exports.newContract = void 0;
/* eslint-disable import/no-dynamic-require */
const ethers_1 = require("ethers");
const chainUtil_1 = require("../dist/common/chainUtil");
const registryLoader_1 = require("./registryLoader");
const registry_1 = require("./registry");
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function renameDuplicatedFactorEntry(abi) {
    const keys = abi.keys();
    // eslint-disable-next-line no-restricted-syntax
    for (const key of keys) {
        const node = abi[key];
        if (node.name === 'factor' && node.inputs.length > 0) {
            node.name = 'factorWithParam';
        }
    }
    return abi;
}
function newContract(contractName, contractInfo, signerInfo) {
    const { providerKey, accountKey } = signerInfo;
    let managerOrProvicer;
    if (accountKey) {
        managerOrProvicer = (0, chainUtil_1.getWalletNonceManager)(providerKey, accountKey);
    }
    else {
        managerOrProvicer = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
    }
    const contractAddress = contractInfo.address;
    let contract;
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
        logger.error(`Not find address for contract: ${contractName}`);
        return contract;
    }
    const abiVersion = contractInfo.abiVersion.replace(/\./g, '-');
    const contractABIFileName = registry_1.ContractABIMapping[contractName];
    // eslint-disable-next-line global-require
    let abi = require(`../abi/${abiVersion}/${contractABIFileName}.json`);
    if (contractName === registry_1.ContractNames.groVault ||
        contractName === registry_1.ContractNames.powerD) {
        abi = renameDuplicatedFactorEntry(abi);
    }
    contract = new ethers_1.ethers.Contract(contractAddress, abi, managerOrProvicer);
    logger.info(`Created new ${contractName} contract.`);
    return { contract, contractInfo };
}
exports.newContract = newContract;
function newLatestContract(contractName, signerInfo) {
    const contractInfo = (0, registryLoader_1.getLatestContractsAddress)()[contractName];
    return newContract(contractName, contractInfo, signerInfo);
}
exports.newLatestContract = newLatestContract;
function newLatestContractByAddress(address, signerInfo) {
    const contractInfo = (0, registryLoader_1.getLatestContractsAddressByAddress)()[address];
    let contract;
    if (!contractInfo) {
        logger.error(`Can't find contract information for address: ${address}`);
        return contract;
    }
    const { contractName } = contractInfo;
    contract = newContract(contractName, contractInfo, signerInfo);
    return contract;
}
function newSystemLatestContracts(signerInfo) {
    const contractsName = Object.keys(registry_1.ContractNames);
    const contracts = {};
    for (let i = 0; i < contractsName.length; i += 1) {
        const contractName = registry_1.ContractNames[contractsName[i]];
        contracts[contractName] = newLatestContract(contractName, signerInfo);
    }
    return contracts;
}
exports.newSystemLatestContracts = newSystemLatestContracts;
async function newSystemLatestVaultStrategyContracts(signerInfo) {
    const result = {};
    const vaultsAddress = [];
    const controller = newLatestContract(registry_1.ContractNames.controller, signerInfo).contract;
    const vaultAddresses = await controller.vaults();
    for (let i = 0; i < vaultAddresses.length; i += 1) {
        const vaultAdapterAddress = vaultAddresses[i];
        vaultsAddress.push(vaultAdapterAddress);
        const vaultAdapter = newLatestContractByAddress(vaultAdapterAddress, signerInfo);
        result[vaultAdapterAddress] = {
            contract: vaultAdapter.contract,
            contractInfo: vaultAdapter.contractInfo,
            vault: {},
        };
    }
    const curveVaultAddress = await controller.curveVault();
    vaultsAddress.push(curveVaultAddress);
    const curveVaultAdapter = newLatestContractByAddress(curveVaultAddress, signerInfo);
    result[curveVaultAddress] = {
        contract: curveVaultAdapter.contract,
        contractInfo: curveVaultAdapter.contractInfo,
        vault: {},
    };
    // init vault for every vault adapter
    const vaultAdapterAddresses = Object.keys(result);
    for (let i = 0; i < vaultAdapterAddresses.length; i += 1) {
        const { contract: vaultAdapter, vault } = result[vaultAdapterAddresses[i]];
        // eslint-disable-next-line no-await-in-loop
        const yearnVaultAddress = await vaultAdapter.vault();
        const vaultInstance = newLatestContractByAddress(yearnVaultAddress, signerInfo);
        vault.contract = vaultInstance.contract;
        vault.contractInfo = vaultInstance.contractInfo;
        vault.strategies = [];
    }
    // init strategy for every vault
    for (let i = 0; i < vaultAdapterAddresses.length; i += 1) {
        const { contract: vaultAdapter, vault } = result[vaultAdapterAddresses[i]];
        const { contract: vaultInstance, strategies } = vault;
        // eslint-disable-next-line no-await-in-loop
        const strategyLength = await vaultAdapter.getStrategiesLength();
        result[vaultAdapterAddresses[i]].strategyLength = strategyLength;
        for (let j = 0; j < strategyLength; j += 1) {
            // eslint-disable-next-line no-await-in-loop
            const strategyAddress = await vaultInstance.withdrawalQueue(j);
            const strategy = newLatestContractByAddress(strategyAddress, signerInfo);
            strategies.push({
                contract: strategy.contract,
                contractInfo: strategy.contractInfo,
            });
        }
    }
    return {
        vaultsAddress,
        contracts: result,
    };
}
exports.newSystemLatestVaultStrategyContracts = newSystemLatestVaultStrategyContracts;
