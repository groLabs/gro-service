"use strict";
const { newSystemLatestContracts, newSystemLatestVaultStrategyContracts, } = require('../../registry/contracts');
const latestSystemContracts = {};
const latestVaultStrategyContracts = {};
const latestStableCoins = {};
const contractCallFailedCount = { personalStas: 0 };
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
async function getLatestStableCoins(providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestStableCoins[providerKey]) {
        latestStableCoins[providerKey] = [];
        const { vaultsAddress, contracts: vaultAndStrategies } = await getLatestVaultsAndStrategies(providerKey);
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
    getLatestVaultsAndStrategies,
    getLatestStableCoins,
    reloadData,
};
