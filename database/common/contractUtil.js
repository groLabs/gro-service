const { ethers } = require('ethers');
const {
    getProvider,
    getProviderKey,
} = require('./globalUtil');
const { ContractNames } = require('../../dist/registry/registry');
const { getLatestSystemContract } = require('../../stats/common/contractStorage');
const erc20ABI = require('../../abi/ERC20.json');

const stableCoins = [];
const stableCoinsInfo = {};

const getGroVault = () => {
    return getLatestSystemContract(ContractNames.groVault, getProviderKey())
        .contract;
}

const getPowerD = () => {
    return getLatestSystemContract(ContractNames.powerD, getProviderKey())
        .contract;
}

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


module.exports = {
    getGroVault,
    getPowerD,
    getBuoy,
    getStables,
    getTokenCounter,
};
