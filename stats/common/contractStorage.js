const {
    newSystemLatestContracts,
    newSystemLatestVaultStrategyContracts,
} = require('../../registry/contracts');

const latestSystemContracts = {};
const latestVaultStrategyContracts = {};

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

async function reloadData(providerKey) {
    if (!providerKey || providerKey.trim() === '') {
        throw new Error('providerKey is empty.');
    }
    latestSystemContracts[providerKey] = newSystemLatestContracts({
        providerKey,
    });
    latestVaultStrategyContracts[providerKey] =
        await newSystemLatestVaultStrategyContracts({
            providerKey,
        });
}

module.exports = {
    getLatestSystemContract,
    getLatestVaultsAndStrategies,
    reloadData,
};
