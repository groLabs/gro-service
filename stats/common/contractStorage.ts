import { ethers } from 'ethers';
import {
    newSystemLatestContracts,
    newSystemLatestVaultStrategyContracts,
} from '../../registry/contracts';
import { ContractABIMapping } from '../../registry/registry';
import { getLatestContractsAddress } from '../../registry/registryLoader';
import { getConfig } from '../../common/configUtil';

const logger = require('../statsLogger');

const latestSystemContracts = {};
const latestContractsOnAVAX = {};
const latestContractsOnAVAXArchived = {};
const latestVaultStrategyContracts = {};
const latestStableCoins = {};
const historyContractsInstance = {};
const contractCallFailedCount = { personalStats: 0, personalMCStats: 0 };
const avaxFullNodeURL = getConfig('blockchain.avax_api_keys.full_node.url');

function newContract(contractName, contractInfo, providerOrWallet) {
    const contractAddress = contractInfo.address.toLowerCase();
    if (!historyContractsInstance[contractAddress]) {
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
        historyContractsInstance[contractAddress] = { contract, contractInfo };
    }
    return historyContractsInstance[contractAddress];
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
    // avalanche chain need to support full_node and archived_node
    // create new contract here to connect to different provider
    const { contract, contractInfo } = latestContractsOnAVAX[contractName];
    const contractWithSpecifiedProvider = contract.connect(providerOrWallet);
    return { contract: contractWithSpecifiedProvider, contractInfo };
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

export {
    contractCallFailedCount,
    getLatestSystemContract,
    getLatestSystemContractOnAVAX,
    getLatestVaultsAndStrategies,
    getLatestStableCoins,
    reloadData,
    newContract,
};
