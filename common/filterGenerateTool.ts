//@ts-nocheck
import { ethers } from 'ethers';
import { ContractNames } from '../registry/registry';
import {
    getContractsHistory,
    getLatestContractsAddress,
} from '../registry/registryLoader';
import { newLatestContract, newContract } from '../registry/contracts';
import { getAlchemyRpcProvider } from './chainUtil';

const stableCoins = [];
const contractStorage = {};
const erc20ABI = require('../abi/ERC20.json');

function getContract(contractName, contractInfo, providerKey) {
    const { address } = contractInfo;
    if (!contractStorage[address]) {
        const { contract } = newContract(contractName, contractInfo, {
            providerKey,
        });
        contractStorage[address] = contract;
    }
    return contractStorage[address];
}

function getLatestContractEventFilter(
    providerKey = 'default',
    contractName,
    eventName,
    fromBlock,
    toBlock = 'latest',
    filterParams = []
) {
    const contractInfo = getLatestContractsAddress()[contractName];
    const contract = getContract(contractName, contractInfo, providerKey);
    const filter = contract.filters[eventName](...filterParams);
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    return { filter, interface: contract.interface };
}

function getContractHistoryEventFilters(
    providerKey = 'default',
    contractName,
    eventName,
    fromBlock,
    toBlock = 'latest',
    filterParams = []
) {
    const contractHistory = getContractsHistory()[contractName];
    const filters = [];
    for (let i = 0; i < contractHistory.length; i += 1) {
        const contractInfo = contractHistory[i];
        const { startBlock } = contractInfo;
        const contract = getContract(contractName, contractInfo, providerKey);
        fromBlock = startBlock > fromBlock ? startBlock : fromBlock;
        const filter = contract.filters[eventName](...filterParams);
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        filters.push({ filter, interface: contract.interface });
    }
    return filters;
}

async function getStableCoins(providerKey) {
    if (!stableCoins.length) {
        const latestController = newLatestContract(ContractNames.controller, {
            providerKey,
        }).contract;
        const stableCoinAddresses = await latestController
            .stablecoins()
            .catch((error) => {
                throw error;
            });
        const provider = getAlchemyRpcProvider(providerKey);
        for (let i = 0; i < stableCoinAddresses.length; i += 1) {
            stableCoins.push(
                new ethers.Contract(stableCoinAddresses[i], erc20ABI, provider)
            );
        }
    }
    return stableCoins;
}

async function getCoinApprovalFilters(
    providerKey = 'default',
    fromBlock,
    toBlock = 'latest',
    account
) {
    const filters = [];
    const depositContractInfo =
        getLatestContractsAddress()[ContractNames.depositHandler];
    // stable coin approve filter
    const coins = await getStableCoins();
    for (let i = 0; i < coins.length; i += 1) {
        const coin = coins[i];
        const filter = coin.filters.Approval(
            account,
            depositContractInfo.address
        );
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        filters.push({ filter, interface: coin.interface });
    }

    // gtoken approve filter
    const groVaultContractInfo =
        getLatestContractsAddress()[ContractNames.groVault];
    const groVault = getContract(
        ContractNames.groVault,
        groVaultContractInfo,
        providerKey
    );
    const groVaultApprovalFilter = groVault.filters.Approval(account, null);
    groVaultApprovalFilter.fromBlock = fromBlock;
    groVaultApprovalFilter.toBlock = toBlock;
    filters.push({
        filter: groVaultApprovalFilter,
        interface: groVault.interface,
    });

    const pwrdContractInfo = getLatestContractsAddress()[ContractNames.powerD];
    const pwrd = getContract(
        ContractNames.powerD,
        pwrdContractInfo,
        providerKey
    );
    const pwrdApprovalFilter = pwrd.filters.Approval(account, null);
    pwrdApprovalFilter.fromBlock = fromBlock;
    pwrdApprovalFilter.toBlock = toBlock;
    filters.push({
        filter: pwrdApprovalFilter,
        interface: pwrd.interface,
    });

    return filters;
}

export {
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
    getCoinApprovalFilters,
};
