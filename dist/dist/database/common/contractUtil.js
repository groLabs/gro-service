"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenCounter = exports.getStables = exports.getBuoy = exports.getPowerD = exports.getGroVault = void 0;
const ethers_1 = require("ethers");
const globalUtil_1 = require("./globalUtil");
const registry_1 = require("../../registry/registry");
const contractStorage_1 = require("../../stats/common/contractStorage");
const ERC20_json_1 = __importDefault(require("../../abi/ERC20.json"));
const stableCoins = [];
const stableCoinsInfo = {};
const getGroVault = () => {
    return (0, contractStorage_1.getLatestSystemContract)(registry_1.ContractNames.groVault, (0, globalUtil_1.getProviderKey)())
        .contract;
};
exports.getGroVault = getGroVault;
const getPowerD = () => {
    return (0, contractStorage_1.getLatestSystemContract)(registry_1.ContractNames.powerD, (0, globalUtil_1.getProviderKey)())
        .contract;
};
exports.getPowerD = getPowerD;
// const getGroDAO = () => {
//     return getLatestSystemContract(ContractNames.getGroDAO, getProviderKey())
//         .contract;
// }
const getTokenCounter = () => {
    return (0, contractStorage_1.getLatestSystemContract)(registry_1.ContractNames.TokenCounter, (0, globalUtil_1.getProviderKey)())
        .contract;
};
exports.getTokenCounter = getTokenCounter;
const getBuoy = () => {
    return (0, contractStorage_1.getLatestSystemContract)(registry_1.ContractNames.buoy3Pool, (0, globalUtil_1.getProviderKey)())
        .contract;
};
exports.getBuoy = getBuoy;
const getStables = async () => {
    const info = await getStableCoinsInfo();
    return info;
};
exports.getStables = getStables;
const getStableCoins = async () => {
    if (!stableCoins.length) {
        const latestController = (0, contractStorage_1.getLatestSystemContract)(registry_1.ContractNames.controller, (0, globalUtil_1.getProvider)()).contract;
        const stableCoinAddresses = await latestController
            .stablecoins()
            .catch((error) => {
            logger.error(error);
            return [];
        });
        for (let i = 0; i < stableCoinAddresses.length; i += 1) {
            stableCoins.push(new ethers_1.ethers.Contract(stableCoinAddresses[i], ERC20_json_1.default, (0, globalUtil_1.getProvider)()));
        }
    }
    return stableCoins;
};
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
};
