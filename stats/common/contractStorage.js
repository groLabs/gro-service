const { ethers } = require('ethers');
const {
    newSystemLatestContracts,
    newSystemLatestVaultStrategyContracts,
} = require('../../dist/registry/contracts');
const { ContractABIMapping } = require('../../dist/registry/registry');
const {
    getLatestContractsAddress,
} = require('../../dist/registry/registryLoader');

const logger = require('../statsLogger');

const latestSystemContracts = {};
const latestContractsOnAVAX = {};
const latestVaultStrategyContracts = {};
const latestStableCoins = {};
const contractCallFailedCount = { personalStats: 0, personalMCStats: 0 };

function newContract(contractName, contractInfo, providerOrWallet) {
    const contractAddress = contractInfo.address;
    let contract;
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
        logger.error(`Not find address for contract: ${contractName}`);
        return contract;
    }
    const abiVersion = contractInfo.abiVersion.replace(/\./g, '-');
    const contractABIFileName = ContractABIMapping[contractName];
    // eslint-disable-next-line global-require
    const abi = require(`../../abi/${abiVersion}/${contractABIFileName}.json`);
    contract = new ethers.Contract(contractAddress, abi, providerOrWallet);
    logger.info(`Created new ${contractName} contract.`);
    return { contract, contractInfo };
}

function getLatestSystemContract(contractName, providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestSystemContracts[providerKey]) {
        latestSystemContracts[providerKey] =
            newSystemLatestContracts(providerKey);
    }
    return latestSystemContracts[providerKey][contractName];
}

function getLatestSystemContractOnAVAX(contractName, providerOrWallet) {
    if (!latestContractsOnAVAX[contractName]) {
        const contractInfo = getLatestContractsAddress()[contractName];
        latestContractsOnAVAX[contractName] = newContract(
            contractName,
            contractInfo,
            providerOrWallet
        );
    }
    return latestContractsOnAVAX[contractName];
}

async function getLatestVaultsAndStrategies(providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestVaultStrategyContracts[providerKey]) {
        latestVaultStrategyContracts[providerKey] =
            await newSystemLatestVaultStrategyContracts({
                providerKey,
            });
    }
    return latestVaultStrategyContracts[providerKey];
}

async function getLatestStableCoins(providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestStableCoins[providerKey]) {
        latestStableCoins[providerKey] = [];
        const { vaultsAddress, contracts: vaultAndStrategies } =
            await getLatestVaultsAndStrategies(providerKey);
        for (let i = 0; i < vaultsAddress.length; i += 1) {
            const { strategies } = vaultAndStrategies[vaultsAddress[i]].vault;
            const { contractInfo } = strategies[0];
            latestStableCoins[providerKey].push(contractInfo.tokens[0]);
        }
    }
    return latestStableCoins[providerKey];
}

async function reloadData(providerKey) {
    if (!providerKey || providerKey.trim() === '') {
        throw new Error('providerKey is empty.');
    }
    latestSystemContracts[providerKey] = await newSystemLatestContracts({
        providerKey,
    });

    latestVaultStrategyContracts[providerKey] =
        await newSystemLatestVaultStrategyContracts({
            providerKey,
        });

    latestStableCoins[providerKey] = undefined;
}

module.exports = {
    contractCallFailedCount,
    getLatestSystemContract,
    getLatestSystemContractOnAVAX,
    getLatestVaultsAndStrategies,
    getLatestStableCoins,
    reloadData,
};
