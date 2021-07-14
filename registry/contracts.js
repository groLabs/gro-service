/* eslint-disable import/no-dynamic-require */
const { ethers } = require('ethers');
const { getConfig } = require('../common/configUtil');
const {
    getWalletNonceManager,
    getAlchemyRpcProvider,
} = require('../common/chainUtil');
const {
    getLatestContractsAddress,
    getLatestContractsAddressByAddress,
} = require('./registryLoader');
const { ContractNames, ContractABIMapping } = require('./registry');

const strategyDisplayName = getConfig('strategy_display_name');

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
        managerOrProvicer = getWalletNonceManager(providerKey, accountKey);
    } else {
        managerOrProvicer = getAlchemyRpcProvider(providerKey);
    }

    const contractAddress = contractInfo.address;
    let contract;
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
        logger.error(`Not find address for contract: ${contractName}`);
        return contract;
    }
    const abiVersion = contractInfo.abiVersion.replace(/\./g, '-');
    const contractABIFileName = ContractABIMapping[contractName];
    // eslint-disable-next-line global-require
    let abi = require(`../abi/${abiVersion}/${contractABIFileName}.json`);
    if (
        contractName === ContractNames.groVault ||
        contractName === ContractNames.powerD
    ) {
        abi = renameDuplicatedFactorEntry(abi);
    }
    contract = new ethers.Contract(contractAddress, abi, managerOrProvicer);
    logger.info(`Created new ${contractName} contract.`);
    return contract;
}

function newLatestContract(contractName, signerInfo) {
    const contractInfo = getLatestContractsAddress()[contractName];
    return newContract(contractName, contractInfo, signerInfo);
}

function newLatestContractByAddress(address, signerInfo) {
    const contractInfo = getLatestContractsAddressByAddress()[address];
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
    const contractsName = Object.keys(ContractNames);
    const contracts = {};
    for (let i = 0; i < contractsName.length; i += 1) {
        const contractName = ContractNames[contractsName[i]];
        contracts[contractName] = newLatestContract(contractName, signerInfo);
    }
    return contracts;
}

async function newSystemLatestVaultStrategyContracts(signerInfo) {
    const result = {};
    const controller = newLatestContract(ContractNames.controller, signerInfo);

    const vaultAddresses = await controller.vaults();
    for (let i = 0; i < vaultAddresses.length; i += 1) {
        const vaultAdapterAddress = vaultAddresses[i];
        const vaultAdapter = newLatestContractByAddress(
            vaultAdapterAddress,
            signerInfo
        );
        result[vaultAdapterAddress] = { contract: vaultAdapter, vault: {} };
    }

    const curveVaultAddress = await controller.curveVault();
    const curveVaultAdapter = newLatestContractByAddress(
        curveVaultAddress,
        signerInfo
    );
    result[curveVaultAddress] = { contract: curveVaultAdapter, vault: {} };

    // init vault for every vault adapter
    const vaultAdapterAddresses = Object.keys(result);
    for (let i = 0; i < vaultAdapterAddresses.length; i += 1) {
        const { contract: vaultAdapter, vault } =
            result[vaultAdapterAddresses[i]];
        // eslint-disable-next-line no-await-in-loop
        const yearnVaultAddress = await vaultAdapter.vault();
        const vaultInstance = newLatestContractByAddress(
            yearnVaultAddress,
            signerInfo
        );
        vault.contract = vaultInstance;
        vault.strategies = [];
    }

    // init strategy for every vault
    for (let i = 0; i < vaultAdapterAddresses.length; i += 1) {
        const { contract: vaultAdapter, vault } =
            result[vaultAdapterAddresses[i]];
        const { contract: vaultInstance, strategies } = vault;
        // eslint-disable-next-line no-await-in-loop
        const strategyLength = await vaultAdapter.getStrategiesLength();
        result[vaultAdapterAddresses[i]].strategyLength = strategyLength;
        for (let j = 0; j < strategyLength; j += 1) {
            // eslint-disable-next-line no-await-in-loop
            const strategyAddress = await vaultInstance.withdrawalQueue(j);
            const strategy = newLatestContractByAddress(
                strategyAddress,
                signerInfo
            );
            strategies.push({
                contract: strategy,
                displayName: strategyDisplayName[i * 2 + j],
            });
        }
    }
    return result;
}

module.exports = {
    newContract,
    newLatestContract,
    newSystemLatestContracts,
    newSystemLatestVaultStrategyContracts,
};