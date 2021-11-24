import { ethers } from 'ethers';
import { getProvider, getProviderKey } from './globalUtil';
import { ContractNames } from '../../registry/registry';
import  { newSystemLatestContracts } from '../../registry/contracts'
import erc20ABI from '../../abi/ERC20.json';

const stableCoins = [];
const stableCoinsInfo: any = {};
const latestSystemContracts = {};

function getLatestSystemContract(contractName, providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestSystemContracts[providerKey]) {
        latestSystemContracts[providerKey] =
            newSystemLatestContracts(providerKey);
    }
    return latestSystemContracts[providerKey][contractName];
}

const getGroVault = () => {
    return getLatestSystemContract(ContractNames.groVault, getProviderKey())
        .contract;
}

const getPowerD = () => {
    return getLatestSystemContract(ContractNames.powerD, getProviderKey())
        .contract;
}

// const getGroDAO = () => {
//     return getLatestSystemContract(ContractNames.getGroDAO, getProviderKey())
//         .contract;
// }

const getTokenCounter = () => {
    return getLatestSystemContract(ContractNames.TokenCounter, getProviderKey())
        .contract;
}

const getBuoy = () => {
    return getLatestSystemContract(ContractNames.buoy3Pool, getProviderKey())
        .contract;
}

const getStables = async () => {
    const info = await getStableCoinsInfo();
    return info;
}

const getStableCoins = async () => {
    if (!stableCoins.length) {
        const latestController = getLatestSystemContract(
            ContractNames.controller,
            getProvider()
        ).contract;
        const stableCoinAddresses = await latestController
            .stablecoins()
            .catch((error) => {
                logger.error(error);
                return [];
            });
        for (let i = 0; i < stableCoinAddresses.length; i += 1) {
            stableCoins.push(
                new ethers.Contract(stableCoinAddresses[i], erc20ABI, getProvider())
            );
        }
    }
    return stableCoins;
}

const getStableCoinsInfo = async () => {
    const keys = Object.keys(stableCoinsInfo);
    if (!keys.length) {
        stableCoinsInfo.decimals = {};
        stableCoinsInfo.symbols = {};
        const coins = await getStableCoins();
        const decimalPromise = [];
        const symbolPromise = [];
        for (let i = 0; i < coins.length; i += 1) {
            decimalPromise.push(coins[i].decimals());
            symbolPromise.push(coins[i].symbol());
        }
        const decimals = await Promise.all(decimalPromise);
        const symbols = await Promise.all(symbolPromise);

        for (let i = 0; i < coins.length; i += 1) {
            stableCoinsInfo.decimals[coins[i].address] = decimals[i].toString();
            stableCoinsInfo.symbols[coins[i].address] = symbols[i];
        }
    }
    return stableCoinsInfo;
}


export {
    getGroVault,
    getPowerD,
    // getGroDAO,
    getBuoy,
    getStables,
    getTokenCounter,
};
