"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkChainlinkPrice = exports.checkCurveCoinRatio = void 0;
const ethers_1 = require("ethers");
const chainUtil_1 = require("../../common/chainUtil");
const alertMessageSender_1 = require("../../common/alertMessageSender");
const allContracts_1 = require("../../contract/allContracts");
const digitalUtil_1 = require("../../common/digitalUtil");
const ICurve3Pool_json_1 = __importDefault(require("./ICurve3Pool.json"));
const stableCoin = ['DAI', 'USDC', 'USDT'];
const stableCoinDecimals = [
    ethers_1.BigNumber.from('1000000000000000000'),
    ethers_1.BigNumber.from('1000000'),
    ethers_1.BigNumber.from('1000000'),
];
async function curveStableCoinBalanceCheck(providerKey) {
    const provider = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
    const curve3PoolAddress = await (0, allContracts_1.getBuoy)().curvePool();
    const curve3Pool = new ethers_1.ethers.Contract(curve3PoolAddress, ICurve3Pool_json_1.default, provider);
    const coinBalances = [];
    const coinRatios = [];
    let total = ethers_1.BigNumber.from(0);
    const balancePromises = [];
    for (let i = 0; i < stableCoin.length; i += 1) {
        balancePromises.push(curve3Pool.balances(i));
    }
    const balancePromisesResult = await Promise.all(balancePromises);
    for (let i = 0; i < stableCoin.length; i += 1) {
        const balance = balancePromisesResult[i].mul(ethers_1.BigNumber.from('1000000000000000000').div(stableCoinDecimals[i]));
        total = total.add(balance);
        coinBalances.push(balance);
    }
    for (let i = 0; i < stableCoin.length; i += 1) {
        const ratio = coinBalances[i].mul(ethers_1.BigNumber.from(10000)).div(total);
        coinRatios.push(ratio);
    }
    return coinRatios;
}
async function checkCurveCoinRatio(providerKey, configCoinRatios) {
    const coinRatios = await curveStableCoinBalanceCheck(providerKey);
    const coinRatiosLenght = coinRatios.length;
    const ratioAbnormal = [];
    for (let i = 0; i < coinRatiosLenght; i += 1) {
        const ratio = coinRatios[i];
        if (ratio.lte(ethers_1.BigNumber.from(configCoinRatios.emery))) {
            ratioAbnormal.push({
                ratio,
                configRatio: ethers_1.BigNumber.from(configCoinRatios.emery),
                level: 'EMERG',
                coin: stableCoin[i],
            });
            break;
        }
        else if (ratio.lte(ethers_1.BigNumber.from(configCoinRatios.crit))) {
            ratioAbnormal.push({
                ratio,
                configRatio: ethers_1.BigNumber.from(configCoinRatios.crit),
                level: 'CRIT',
                coin: stableCoin[i],
            });
            break;
        }
        else if (ratio.lte(ethers_1.BigNumber.from(configCoinRatios.warn))) {
            ratioAbnormal.push({
                ratio,
                configRatio: ethers_1.BigNumber.from(configCoinRatios.warn),
                level: 'WARN',
                coin: stableCoin[i],
            });
            break;
        }
    }
    if (ratioAbnormal.length) {
        const { ratio, configRatio, level, coin } = ratioAbnormal[0];
        const urgency = level === 'EMERG' ? 'high' : 'low';
        const ratioPercent = ratio.div(ethers_1.BigNumber.from(100));
        const configRatioPercent = configRatio.div(ethers_1.BigNumber.from(100));
        (0, alertMessageSender_1.sendAlertMessage)({
            discord: {
                description: `[${level}] P5 - Curve coin balance compare | Coin ${coin} is ${ratioPercent}% below ${configRatioPercent}% of tri-pool`,
            },
            pagerduty: {
                urgency,
                title: `[${level}] P5 - Curve coin balance compare`,
                description: `[${level}] P5 - Coin ${coin} is ${ratioPercent}% below ${configRatioPercent}% of tri-pool`,
            },
        });
    }
}
exports.checkCurveCoinRatio = checkCurveCoinRatio;
async function checkChainlinkPrice(price, configPrice) {
    const { emery, crit, warn } = configPrice;
    const ratioAbnormal = [];
    if (price.high.value.gte(ethers_1.BigNumber.from(emery.high))) {
        ratioAbnormal.push({
            key: price.high.key,
            level: 'EMERG',
            value: price.high.value,
        });
    }
    else if (price.high.value.gte(ethers_1.BigNumber.from(crit.high))) {
        ratioAbnormal.push({
            key: price.high.key,
            level: 'CRIT',
            value: price.high.value,
        });
    }
    else if (price.high.value.gte(ethers_1.BigNumber.from(warn.high))) {
        ratioAbnormal.push({
            key: price.high.key,
            level: 'WARN',
            value: price.high.value,
        });
    }
    if (ratioAbnormal.length) {
        const { key, level, value } = ratioAbnormal[0];
        const urgency = level === 'EMERG' ? 'high' : 'low';
        const pricePairValue = (0, digitalUtil_1.formatNumber)(value, 4, 2);
        const pridePair = key.toUpperCase().split('TO');
        (0, alertMessageSender_1.sendAlertMessage)({
            discord: {
                description: `[${level}] P4 - Chainlink coin pair compare | Ratio between ${pridePair[0]} and ${pridePair[1]} is ${pricePairValue}, threshold 1.4`,
            },
            pagerduty: {
                urgency,
                title: `[${level}] P4 - Chainlink price pair compare`,
                description: `[${level}] P4 - Ratio between ${pridePair[0]} and ${pridePair[1]} is ${pricePairValue}, threshold 1.4`,
            },
        });
    }
}
exports.checkChainlinkPrice = checkChainlinkPrice;
