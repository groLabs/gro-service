const { ethers, BigNumber } = require('ethers');

const { getAlchemyRpcProvider } = require('../common/chainUtil');
const { sendAlertMessage } = require('../common/alertMessageSender');
const { getBuoy } = require('../contract/allContracts');
const { formatNumber } = require('../common/digitalUtil');
const curve3PoolABI = require('./ICurve3Pool.json');

const PERCENT_DECIAML = BigNumber.from(10000);
const curve3PoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const stabeCoin = ['DAI', 'USDC', 'USDT'];
const stabeCoinDecimals = [
    BigNumber.from('1000000000000000000'),
    BigNumber.from('1000000'),
    BigNumber.from('1000000'),
];

async function curveStabeCoinBalanceCheck(providerKey) {
    const provider = getAlchemyRpcProvider(providerKey);
    const curve3Pool = new ethers.Contract(
        curve3PoolAddress,
        curve3PoolABI,
        provider
    );
    const coinBalances = [];
    const coinRatios = [];
    let total = BigNumber.from(0);
    const balancePromises = [];
    for (let i = 0; i < stabeCoin.length; i += 1) {
        balancePromises.push(curve3Pool.balances(i));
    }
    const balancePromisesResult = await Promise.all(balancePromises);
    for (let i = 0; i < stabeCoin.length; i += 1) {
        const balance = balancePromisesResult[i].mul(
            BigNumber.from('1000000000000000000').div(stabeCoinDecimals[i])
        );
        total = total.add(balance);
        coinBalances.push(balance);
    }

    for (let i = 0; i < stabeCoin.length; i += 1) {
        const ratio = coinBalances[i].mul(BigNumber.from(10000)).div(total);
        coinRatios.push(ratio);
    }
    return coinRatios;
}

async function checkCurveCoinRatio(providerKey, configCoinRatios) {
    const coinRatios = await curveStabeCoinBalanceCheck(providerKey);
    const coinRatiosLenght = coinRatios.length;
    const ratioAbnormal = [];
    for (let i = 0; i < coinRatiosLenght; i += 1) {
        const ratio = coinRatios[i];
        if (ratio.lte(BigNumber.from(configCoinRatios.emery))) {
            ratioAbnormal.push({
                ratio,
                configRatio: BigNumber.from(configCoinRatios.emery),
                level: 'EMERG',
                coin: stabeCoin[i],
            });
            break;
        } else if (ratio.lte(BigNumber.from(configCoinRatios.crit))) {
            ratioAbnormal.push({
                ratio,
                configRatio: BigNumber.from(configCoinRatios.crit),
                level: 'CRIT',
                coin: stabeCoin[i],
            });
            break;
        } else if (ratio.lte(BigNumber.from(configCoinRatios.warn))) {
            ratioAbnormal.push({
                ratio,
                configRatio: BigNumber.from(configCoinRatios.warn),
                level: 'WARN',
                coin: stabeCoin[i],
            });
            break;
        }
    }

    if (ratioAbnormal.length) {
        const { ratio, configRatio, level, coin } = ratioAbnormal[0];
        const urgency = level === 'EMERG' ? 'high' : 'low';
        const ratioPercent = ratio.div(BigNumber.from(100));
        const configRatioPercent = configRatio.div(BigNumber.from(100));
        sendAlertMessage({
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

async function checkChainlinkPrice(price, configPrice) {
    const { emery, crit, warn } = configPrice;
    const ratioAbnormal = [];
    if (price.high.value.gte(BigNumber.from(emery.high))) {
        ratioAbnormal.push({
            key: price.high.key,
            level: 'EMERG',
            value: price.high.value,
        });
    } else if (price.high.value.gte(BigNumber.from(crit.high))) {
        ratioAbnormal.push({
            key: price.high.key,
            level: 'CRIT',
            value: price.high.value,
        });
    } else if (price.high.value.gte(BigNumber.from(warn.high))) {
        ratioAbnormal.push({
            key: price.high.key,
            level: 'WARN',
            value: price.high.value,
        });
    }

    if (ratioAbnormal.length) {
        const { key, level, value } = ratioAbnormal[0];
        const urgency = level === 'EMERG' ? 'high' : 'low';
        const pricePairValue = formatNumber(value, 4, 2);
        const pridePair = key.toUpperCase().split('TO');
        sendAlertMessage({
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

module.exports = {
    checkCurveCoinRatio,
    checkChainlinkPrice,
};
