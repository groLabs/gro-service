import { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import { getBuoy, getController } from '../../contract/allContracts';

import { ContractCallError } from '../../common/error';

import { MESSAGE_TYPES } from '../../common/discord/discordService';
import { getConfig } from '../../common/configUtil';
import { getCurrentBlockNumber, getWalletNonceManager } from '../../common/chainUtil';
import { curvePriceMessage, chainlinkPriceMessage, strategyCheckMessage } from '../../discordMessage/criticalMessage';
const dependencyStrategyABI = require('../abis/DependencyStrategy.json').abi;

interface ICurvePoolStrategy {
    yearn: string;
    curve: string;
}

const beforeBlock = getConfig('before_block', false) as number || 30;
const perPriceFailedPercentage =
    getConfig('fail_percentage_pre_price', false) as number || 50;
const totalFailedPercentage = getConfig('fail_percentage_total', false) as number || 1000;
const harvestStrategies = getConfig('harvest_strategy_dependency') as string[];
const creamStrategies = getConfig('cream_strategy_dependency') as string[];
const curvePoolStrategy = getConfig('curve_strategy_dependency') as ICurvePoolStrategy;
const ratioUpperBond = BigNumber.from(getConfig('ratioUpperBond'));
const ratioLowerBond = BigNumber.from(getConfig('ratioLowerBond'));
const curveRatioLowerBond = BigNumber.from(getConfig('curveRatioLowerBond'));
const PERCENT_DECIAML = BigNumber.from(10).pow(BigNumber.from(4));

const logger = require('../criticalLogger');

function getFailedEmbedMessage(messageType: any, criticalType: string) {
    return {
        type: messageType,
        description: `**${criticalType}** an internal call error has occurred`,
    };
}

function handleError(error: any, content: { curveCheck?: any; strategyCheck?: any; }) {
    logger.error(error);
    if (content.curveCheck) {
        throw new ContractCallError(
            content.curveCheck.message,
            MESSAGE_TYPES.curveCheck,
            {
                //@ts-ignore
                embedMessage: getFailedEmbedMessage(
                    MESSAGE_TYPES.curveCheck,
                    'Curve Price Check'
                ),
            }
        );
    }
    if (content.strategyCheck) {
        throw new ContractCallError(
            content.strategyCheck.message,
            MESSAGE_TYPES.strategyCheck,
            {
                //@ts-ignore
                embedMessage: getFailedEmbedMessage(
                    MESSAGE_TYPES.strategyCheck,
                    'Strategy Price Check'
                ),
            }
        );
    }
}

async function getStableCoins(providerKey: any, walletKey: any) {
    const stableCoins = await getController(providerKey, walletKey)
        .stablecoins()
        .catch((error: any) => {
            handleError(error, {
                curveCheck: { message: 'Get underlyingTokens failed' },
            });
        });
    return stableCoins;
}

function outOfRange(value: BigNumber) {
    // const upperBond = decimal.mul(ratioUpperBond).div(BigNumber.from(10000));
    // const lowerBond = decimal.mul(ratioLowerBond).div(BigNumber.from(10000));
    logger.info(
        `value ${value} uppder ${ratioUpperBond} lower ${ratioLowerBond}`
    );
    return value.lt(ratioLowerBond) || value.gt(ratioUpperBond);
}

function findBrokenToken(price01: BigNumber, price02: BigNumber, price12: BigNumber) {
    if (outOfRange(price01)) {
        // one of 0,1 has issue
        if (outOfRange(price02)) {
            // one of 0,2 has issue
            return 0;
        }
        // 0,2 are close, 1 has issue
        return 1;
    }

    if (outOfRange(price02)) {
        // 0,1 are close and 0,2 has issue => 2 has issue
        return 2;
    }

    if (outOfRange(price12)) {
        // 0,1 are close and 1,2 has issue => 2 has issue
        return 2;
    }
    return 3;
}

function chainlinkPricePairCheck(coinPrices: { daiPrice: BigNumber; usdcPrice: BigNumber; usdtPrice: BigNumber; }) {
    const { daiPrice, usdcPrice, usdtPrice } = coinPrices;

    const daiToUsdcPrice = daiPrice.mul(PERCENT_DECIAML).div(usdcPrice);
    const daiToUSDTPrice = daiPrice.mul(PERCENT_DECIAML).div(usdtPrice);
    const usdcToDAIPrice = usdcPrice.mul(PERCENT_DECIAML).div(daiPrice);
    const usdcToUSDTPrice = usdcPrice.mul(PERCENT_DECIAML).div(usdtPrice);
    const udstToDAIPrice = usdtPrice.mul(PERCENT_DECIAML).div(daiPrice);
    const udstToUSDCPrice = usdtPrice.mul(PERCENT_DECIAML).div(usdcPrice);

    const pricePairs = {
        daiTousdc: daiToUsdcPrice,
        daiTousdt: daiToUSDTPrice,
        usdcTodai: usdcToDAIPrice,
        usdcTousdt: usdcToUSDTPrice,
        usdtTodai: udstToDAIPrice,
        usdtTousdc: udstToUSDCPrice,
    };

    const keys = Object.keys(pricePairs);
    let high = { key: keys[0], value: pricePairs[keys[0]] };
    let low = { key: keys[0], value: pricePairs[keys[0]] };
    for (let i = 1; i < keys.length; i += 1) {
        const key = keys[i];
        const value: BigNumber = pricePairs[key];
        if (value.gt(high.value)) {
            high = { key, value };
        }
        if (value.lt(low.value)) {
            low = { key, value };
        }
    }

    return { high, low };
}

export async function curvePriceCheck(providerKey: any, walletKey: any) {
    const buoyInstance = getBuoy(providerKey, walletKey);
    const price0 = await buoyInstance.getPriceFeed(0);
    const price1 = await buoyInstance.getPriceFeed(1);
    const price2 = await buoyInstance.getPriceFeed(2);
    logger.info(`pricefeed ${price0} ${price1} ${price2}`);

    const chainlinkPricePair = chainlinkPricePairCheck({
        daiPrice: price0,
        usdcPrice: price1,
        usdtPrice: price2,
    });

    const price01 = price0.mul(PERCENT_DECIAML).div(price1);
    const price02 = price0.mul(PERCENT_DECIAML).div(price2);
    const price12 = price1.mul(PERCENT_DECIAML).div(price2);
    logger.info(`price01 ${price01}`);
    logger.info(`price02 ${price02}`);
    logger.info(`price12 ${price12}`);
    const coinIndex = findBrokenToken(price01, price02, price12);
    logger.info(`coinIndex ${coinIndex}`);
    let curvePrice = true;
    if (coinIndex < 3) {
        logger.info(`set emergency status - coinIndex : ${coinIndex}`);
        // await getController(providerKey, walletKey)
        //     .emergency(coinIndex)
        //     .catch((error) => {
        //         handleError(error, {
        //             curveCheck: {
        //                 message: 'Call stop function to stop system failed',
        //             },
        //         });
        //     });
        curvePrice = false;
    }
    chainlinkPriceMessage({
        needStop: coinIndex < 3,
        abnormalIndex: coinIndex,
    });
    return { curvePrice, chainlinkPricePair };
}

async function buoyHealthCheck(
    providerKey,
    walletKey,
    currentBlockNumber,
    previousHealth
) {
    try {
        // const stableCoins = await getStableCoins(providerKey, walletKey);
        const buoyInstance = getBuoy(providerKey, walletKey);
        logger.info(`buoyInstance ${buoyInstance.address}`);
        // any stable coin less than 10% in curve will return false;
        const checkResult = await buoyInstance.healthCheck(
            curveRatioLowerBond,
            {
                blockTag: currentBlockNumber,
            }
        );
        const healthCheck = checkResult[0];
        const coinIndex = checkResult[1];
        const previousHealthCheck = previousHealth ? previousHealth[0] : true;
        const previousCoinIndex = previousHealth ? previousHealth[1] : 3;
        logger.info(
            `curveRatioLowerBond ${curveRatioLowerBond} healthCheck ${currentBlockNumber} ${healthCheck} ${coinIndex}`
        );

        if (!previousHealthCheck) {
            if (!healthCheck) {
                logger.info(
                    `buoy health check failed again, handle emergency: previousCoinIndex ${previousCoinIndex} coinindex ${coinIndex}`
                );
                if (previousCoinIndex.eq(coinIndex) && coinIndex < 3) {
                    logger.info(
                        `set emergency status - coinIndex : ${coinIndex}`
                    );
                    // await getController(providerKey, walletKey)
                    //     .emergency(coinIndex)
                    //     .catch((error) => {
                    //         handleError(error, {
                    //             curveCheck: {
                    //                 message: 'Call stop function to stop system failed',
                    //             },
                    //         });
                    //     });
                }
            }
            curvePriceMessage({
                needStop: coinIndex < 3,
                abnormalIndex: coinIndex,
            });
        }
        return checkResult;
    } catch (e) {
        logger.error(e);
    }
    return [false, undefined];
}

export async function buoyHealthCheckAcrossBlocks(providerKey, walletKey) {
    const currentBlockNumber = await getCurrentBlockNumber(providerKey).catch(
        (error) => {
            handleError(error, {
                strategyCheck: {
                    message: 'Get current block number failed',
                },
            });
        }
    );
    const health = await buoyHealthCheck(
        providerKey,
        walletKey,
        currentBlockNumber,
        undefined
    );
    if (!health[0]) {
        logger.info(`health check: ${health[0]}, check next block after 30s`);
        setTimeout(
            buoyHealthCheck,
            30000,
            providerKey,
            walletKey,
            currentBlockNumber + 1,
            health
        );
    }
    return health;
}

async function checkSingleStrategy(
    strategyAddress,
    method,
    failedPercentage,
    beforeBlockNumber,
    nonceManager
) {
    let failed = 0;
    const strategy = new ethers.Contract(
        strategyAddress,
        dependencyStrategyABI,
        nonceManager
    );

    const currentSharePrice = await strategy[method]().catch((error) => {
        handleError(error, {
            strategyCheck: {
                message: `Call ${strategyAddress}'s ${method} function failed`,
            },
        });
    });
    const preSharePrice = await strategy[method]({
        blockTag: beforeBlockNumber,
    }).catch((error) => {
        handleError(error, {
            strategyCheck: {
                message: `Call ${strategyAddress}'s ${method} function on block: ${beforeBlockNumber} failed`,
            },
        });
    });

    if (currentSharePrice.lt(preSharePrice)) {
        const decrease = preSharePrice.sub(currentSharePrice);
        const maxDecrease = preSharePrice
            .mul(BigNumber.from(failedPercentage))
            .div(BigNumber.from(10000));
        failed = decrease.gt(maxDecrease);
    } else {
        const increase = currentSharePrice.sub(preSharePrice);
        const percent = increase
            .mul(BigNumber.from(10000))
            .div(currentSharePrice);
        logger.info(
            `pre-${method} ${preSharePrice} current-${method} ${currentSharePrice} changePercent ${percent}`
        );
    }
    return failed;
}

interface MsgLabel {
    name: string;
    address: string;
}

export async function strategyCheck(providerKey, walletKey) {
    const nonceManager = getWalletNonceManager(providerKey, walletKey);
    // Harvest strategy check
    const currentBlockNumber = await getCurrentBlockNumber(providerKey).catch(
        (error) => {
            handleError(error, {
                strategyCheck: {
                    message: 'Get current block number failed',
                },
            });
        }
    );
    const beforeBlockNumber = currentBlockNumber - beforeBlock;
    let strategyFailedTotal = 0;
    const msgLabel: MsgLabel[] = [];
    for (let i = 0; i < harvestStrategies.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const harvestStrategyResult = await checkSingleStrategy(
            harvestStrategies[i],
            'getPricePerFullShare',
            perPriceFailedPercentage,
            beforeBlockNumber,
            nonceManager
        );
        strategyFailedTotal += harvestStrategyResult;
        if (harvestStrategyResult) {
            msgLabel.push({
                name: 'Harvest',
                address: harvestStrategies[i],
            });
        }
        if (strategyFailedTotal > 1) {
            break;
        }
    }

    // Cream strategy check
    if (strategyFailedTotal < 1) {
        for (let i = 0; i < creamStrategies.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const creamStrategyResult = await checkSingleStrategy(
                creamStrategies[i],
                'totalReserves',
                totalFailedPercentage,
                beforeBlockNumber,
                nonceManager
            );
            strategyFailedTotal += creamStrategyResult;
            if (creamStrategyResult) {
                msgLabel.push({
                    name: 'Cream',
                    address: creamStrategies[i],
                });
            }
            if (strategyFailedTotal > 1) {
                break;
            }
        }
    }

    if (strategyFailedTotal < 1) {
        // XPool strategy check
        const xPoolStrategyResult = await checkSingleStrategy(
            curvePoolStrategy.yearn,
            'getPricePerFullShare',
            perPriceFailedPercentage,
            beforeBlockNumber,
            nonceManager
        );

        strategyFailedTotal += xPoolStrategyResult;
        if (xPoolStrategyResult) {
            msgLabel.push({
                name: 'Xpool Yearn',
                address: curvePoolStrategy.yearn,
            });
        }
    }

    if (strategyFailedTotal > 0) {
        logger.info(
            `strategy dependenncy failed: strategyFailedTotal ${strategyFailedTotal}`
        );
        // await getController(providerKey, walletKey)
        //     .pause()
        //     .catch((error) => {
        //         handleError(error, {
        //             strategyCheck: {
        //                 message: 'Call pause function to pause system failed',
        //             },
        //         });
        //     });
    }

    strategyCheckMessage({ failedNumber: strategyFailedTotal });
    return strategyFailedTotal;
}
