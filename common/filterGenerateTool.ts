//@ts-nocheck
import { ethers } from 'ethers';
import { ContractNames } from '../registry/registry';
import { getContractsHistory, getLatestContractsAddress } from '../registry/registryLoader';
import { newLatestContract, newContract } from '../registry/contracts';
import { getAlchemyRpcProvider } from './chainUtil';

const stableCoins = [];
const erc20ABI = require('../abi/ERC20.json');

function getLatestContractEventFilter(
    providerKey = 'default',
    contractName,
    eventName,
    fromBlock,
    toBlock = 'latest',
    filterParams = []
) {
    const { contract } = newLatestContract(contractName, { providerKey });
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
        const { contract } = newContract(contractName, contractInfo, {
            providerKey,
        });
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
    const groVault = newLatestContract(ContractNames.groVault, {
        providerKey,
    }).contract;
    const groVaultContractInfo =
        getLatestContractsAddress()[ContractNames.groVault];
    const groVaultApprovalFilter = groVault.filters.Approval(account, null);
    groVaultApprovalFilter.fromBlock = fromBlock;
    groVaultContractInfo.toBlock = toBlock;
    filters.push({
        filter: groVaultApprovalFilter,
        interface: groVaultApprovalFilter.interface,
    });

    const pwrd = newLatestContract(ContractNames.powerD, {
        providerKey,
    }).contract;
    const pwrdApprovalFilter = pwrd.filters.Approval(account, null);
    pwrdApprovalFilter.fromBlock = fromBlock;
    pwrdApprovalFilter.toBlock = toBlock;
    filters.push({
        filter: pwrdApprovalFilter,
        interface: pwrdApprovalFilter.interface,
    });

    return filters;
}

export {
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
    getCoinApprovalFilters,
};
