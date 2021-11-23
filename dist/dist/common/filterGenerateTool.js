"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoinApprovalFilters = exports.getContractHistoryEventFilters = exports.getLatestContractEventFilter = void 0;
//@ts-nocheck
const ethers_1 = require("ethers");
const registry_1 = require("../registry/registry");
const registryLoader_1 = require("../registry/registryLoader");
const contracts_1 = require("../registry/contracts");
const chainUtil_1 = require("./chainUtil");
const stableCoins = [];
const erc20ABI = require('../abi/ERC20.json');
function getLatestContractEventFilter(providerKey = 'default', contractName, eventName, fromBlock, toBlock = 'latest', filterParams = []) {
    const { contract } = (0, contracts_1.newLatestContract)(contractName, { providerKey });
    const filter = contract.filters[eventName](...filterParams);
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    return { filter, interface: contract.interface };
}
exports.getLatestContractEventFilter = getLatestContractEventFilter;
function getContractHistoryEventFilters(providerKey = 'default', contractName, eventName, fromBlock, toBlock = 'latest', filterParams = []) {
    const contractHistory = (0, registryLoader_1.getContractsHistory)()[contractName];
    const filters = [];
    for (let i = 0; i < contractHistory.length; i += 1) {
        const contractInfo = contractHistory[i];
        const { startBlock } = contractInfo;
        const { contract } = (0, contracts_1.newContract)(contractName, contractInfo, {
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
exports.getContractHistoryEventFilters = getContractHistoryEventFilters;
async function getStableCoins(providerKey) {
    if (!stableCoins.length) {
        const latestController = (0, contracts_1.newLatestContract)(registry_1.ContractNames.controller, {
            providerKey,
        }).contract;
        const stableCoinAddresses = await latestController
            .stablecoins()
            .catch((error) => {
            throw error;
        });
        const provider = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
        for (let i = 0; i < stableCoinAddresses.length; i += 1) {
            stableCoins.push(new ethers_1.ethers.Contract(stableCoinAddresses[i], erc20ABI, provider));
        }
    }
    return stableCoins;
}
async function getCoinApprovalFilters(providerKey = 'default', fromBlock, toBlock = 'latest', account) {
    const filters = [];
    const depositContractInfo = (0, registryLoader_1.getLatestContractsAddress)()[registry_1.ContractNames.depositHandler];
    // stable coin approve filter
    const coins = await getStableCoins();
    for (let i = 0; i < coins.length; i += 1) {
        const coin = coins[i];
        const filter = coin.filters.Approval(account, depositContractInfo.address);
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        filters.push({ filter, interface: coin.interface });
    }
    // gtoken approve filter
    const groVault = (0, contracts_1.newLatestContract)(registry_1.ContractNames.groVault, {
        providerKey,
    }).contract;
    const groVaultContractInfo = (0, registryLoader_1.getLatestContractsAddress)()[registry_1.ContractNames.groVault];
    const groVaultApprovalFilter = groVault.filters.Approval(account, null);
    groVaultApprovalFilter.fromBlock = fromBlock;
    groVaultContractInfo.toBlock = toBlock;
    filters.push({
        filter: groVaultApprovalFilter,
        interface: groVaultApprovalFilter.interface,
    });
    const pwrd = (0, contracts_1.newLatestContract)(registry_1.ContractNames.powerD, {
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
exports.getCoinApprovalFilters = getCoinApprovalFilters;
