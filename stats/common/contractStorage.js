const {
    newSystemLatestContracts,
    newSystemLatestVaultStrategyContracts,
} = require('../../registry/contracts');
const { ContractNames } = require('../../registry/registry');

const latestSystemContracts = {};
const latestVaultStrategyContracts = {};
const latestStabeCoins = {};

function getLatestSystemContract(contractName, providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestSystemContracts[providerKey]) {
        latestSystemContracts[providerKey] =
            newSystemLatestContracts(providerKey);
    }
    return latestSystemContracts[providerKey][contractName];
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

async function getLatestStabeCoins(providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestStabeCoins[providerKey]) {
        latestStabeCoins[providerKey] = [];
        const { vaultsAddress, contracts: vaultAndStrategies } =
            await getLatestVaultsAndStrategies(providerKey);
        for (let i = 0; i < vaultsAddress.length; i += 1) {
            const { strategies } = vaultAndStrategies[vaultsAddress[i]].vault;
            const { contractInfo } = strategies[0];
            latestStabeCoins[providerKey].push(contractInfo.tokens[0]);
        }
    }
    return latestStabeCoins[providerKey];
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

    latestStabeCoins[providerKey] = undefined;
}

module.exports = {
    getLatestSystemContract,
    getLatestVaultsAndStrategies,
    getLatestStabeCoins,
    reloadData,
};
