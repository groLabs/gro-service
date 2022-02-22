import { ethers, BigNumber } from 'ethers';

import { getAlchemyRpcProvider } from '../../common/chainUtil';
import { sendAlertMessage } from '../../common/alertMessageSender';
import { getBuoy } from '../../contract/allContracts';
import { formatNumber } from '../../common/digitalUtil';
import curve3PoolABI from './ICurve3Pool.json';

const stableCoin = ['DAI', 'USDC', 'USDT'];
const stableCoinDecimals = [
    BigNumber.from('1000000000000000000'),
    BigNumber.from('1000000'),
    BigNumber.from('1000000'),
];

async function curveStableCoinBalanceCheck(providerKey) {
    const provider = getAlchemyRpcProvider(providerKey);
    const curve3PoolAddress = await getBuoy().curvePool();
    const curve3Pool = new ethers.Contract(
        curve3PoolAddress,
        curve3PoolABI,
        provider
    );
    const coinBalances: any[] = [];
    const coinRatios: any[] = [];
    let total = BigNumber.from(0);
    const balancePromises: any[] = [];
    for (let i = 0; i < stableCoin.length; i += 1) {
        balancePromises.push(curve3Pool.balances(i));
    }
    const balancePromisesResult = await Promise.all(balancePromises);
    for (let i = 0; i < stableCoin.length; i += 1) {
        const balance = balancePromisesResult[i].mul(
            BigNumber.from('1000000000000000000').div(stableCoinDecimals[i])
        );
        total = total.add(balance);
        coinBalances.push(balance);
    }

    for (let i = 0; i < stableCoin.length; i += 1) {
        const ratio = coinBalances[i].mul(BigNumber.from(10000)).div(total);
        coinRatios.push(ratio);
    }
    return coinRatios;
}

export async function checkCurveCoinRatio(providerKey, configCoinRatios) {
    const coinRatios = await curveStableCoinBalanceCheck(providerKey);
    const coinRatiosLenght = coinRatios.length;
    const ratioAbnormal: any[] = [];
    for (let i = 0; i < coinRatiosLenght; i += 1) {
        const ratio = coinRatios[i];
        if (ratio.lte(BigNumber.from(configCoinRatios.emery))) {
            ratioAbnormal.push({
                ratio,
                configRatio: BigNumber.from(configCoinRatios.emery),
                level: 'EMERG',
                coin: stableCoin[i],
            });
            break;
        } else if (ratio.lte(BigNumber.from(configCoinRatios.crit))) {
            ratioAbnormal.push({
                ratio,
                configRatio: BigNumber.from(configCoinRatios.crit),
                level: 'CRIT',
                coin: stableCoin[i],
            });
            break;
        } else if (ratio.lte(BigNumber.from(configCoinRatios.warn))) {
            ratioAbnormal.push({
                ratio,
                configRatio: BigNumber.from(configCoinRatios.warn),
                level: 'WARN',
                coin: stableCoin[i],
            });
            break;
        }
    }

    if (ratioAbnormal.length) {
        const { ratio, configRatio, level, coin } = ratioAbnormal[0];
        const ratioPercent = ratio.div(BigNumber.from(100));
        const configRatioPercent = configRatio.div(BigNumber.from(100));
        sendAlertMessage({
            discord: {
                description: `[${level}] P5 - Curve coin balance compare | Coin ${coin} is ${ratioPercent}% below ${configRatioPercent}% of tri-pool`,
            },
            pagerduty: {
                title: `[${level}] P5 - Curve coin balance compare`,
                details: `[${level}] P5 - Coin ${coin} is ${ratioPercent}% below ${configRatioPercent}% of tri-pool`,
            },
        });
    }
}

export async function checkChainlinkPrice(price, configPrice) {
    const { emery, crit, warn } = configPrice;
    const ratioAbnormal: any[] = [];
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
        const pricePairValue = formatNumber(value, 4, 2);
        const pridePair = key.toUpperCase().split('TO');
        sendAlertMessage({
            discord: {
                description: `[${level}] P4 - Chainlink coin pair compare | Ratio between ${pridePair[0]} and ${pridePair[1]} is ${pricePairValue}, threshold 1.4`,
            },
            pagerduty: {
                title: `[${level}] P4 - Chainlink price pair compare`,
                details: `[${level}] P4 - Ratio between ${pridePair[0]} and ${pridePair[1]} is ${pricePairValue}, threshold 1.4`,
            },
        });
    }
}
