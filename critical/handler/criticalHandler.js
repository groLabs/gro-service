const { BigNumber } = require('ethers');
const { ethers } = require('ethers');
const {
    getBuoy,
    getChainPrice,
    getController,
} = require('../../contract/allContracts');

const { ContractCallError } = require('../../common/error');

const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const {
    getCurrentBlockNumber,
    getWalletNonceManager,
} = require('../../common/chainUtil');
const {
    curvePriceMessage,
    strategyCheckMessage,
} = require('../../discordMessage/criticalMessage');
const dependencyStrategyABI = require('../abis/DependencyStrategy.json').abi;

const beforeBlock = getConfig('before_block', false) || 30;
const perPriceFailedPercentage =
    getConfig('fail_percentage_pre_price', false) || 50;
const totalFailedPercentage = getConfig('fail_percentage_total', false) || 1000;
const harvestStrategies = getConfig('harvest_strategy_dependency');
const creamStrategies = getConfig('cream_strategy_dependency');
const curvePoolStrategy = getConfig('curve_strategy_dependency');
const ratioUpperBond = BigNumber.from(getConfig('ratioUpperBond'));
const ratioLowerBond = BigNumber.from(getConfig('ratioLowerBond'));

const logger = require('../criticalLogger');

function getFailedEmbedMessage(messageType, criticalType) {
    return {
        type: messageType,
        description: `**${criticalType}** an internal call error has occurred`,
    };
}

function handleError(error, content) {
    logger.error(error);
    if (content.curveCheck) {
        throw new ContractCallError(
            content.curveCheck.message,
            MESSAGE_TYPES.curveCheck,
            {
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
                embedMessage: getFailedEmbedMessage(
                    MESSAGE_TYPES.strategyCheck,
                    'Strategy Price Check'
                ),
            }
        );
    }
}

async function getStabeCoins(providerKey, walletKey) {
    const stabeCoins = await getController(providerKey, walletKey)
        .stablecoins()
        .catch((error) => {
            handleError(error, {
                curveCheck: { message: 'Get underlyingTokens failed' },
            });
        });
    return stabeCoins;
}

async function checkPriceUpdateInChainPrice(
    stabeCoins,
    providerKey,
    walletKey
) {
    // Smart contracts change that removed ChainPrice contract need reconsider this logic
    // TODO
    // const chainPriceInstance = getChainPrice(providerKey, walletKey);
    // for (let i = 0; i < stabeCoins.length; i += 1) {
    //     // eslint-disable-next-line no-await-in-loop
    //     const checkResult = await chainPriceInstance
    //         .priceUpdateCheck(stabeCoins[i])
    //         .catch((error) => {
    //             handleError(error, {
    //                 curveCheck: {
    //                     message: 'Call priceUpdateCheck failed',
    //                 },
    //             });
    //         });
    //     logger.info(`stabeCoins ${i}, ${checkResult}`);
    //     if (checkResult) {
    //         // eslint-disable-next-line no-await-in-loop
    //         await chainPriceInstance
    //             .updateTokenRatios(stabeCoins[i])
    //             .catch((error) => {
    //                 handleError(error, {
    //                     curveCheck: {
    //                         message: 'Call updateTokenRatios failed',
    //                     },
    //                 });
    //             });
    //     }
    // }
}

function outOfRange(value, decimal) {
    const upperBond = decimal.mul(ratioUpperBond).div(BigNumber.from(10000));
    const lowerBond = decimal.mul(ratioLowerBond).div(BigNumber.from(10000));
    logger.info(`uppder ${upperBond} lower ${lowerBond}`);
    return value.lt(lowerBond) || value.gt(upperBond);
}

function findBrokenToken(price01, price02, price12) {
    if (outOfRange(price01[0], price01[1])) {
        // one of 0,1 has issue
        if (outOfRange(price02[0], price02[1])) {
            // one of 0,2 has issue
            return 0;
        }
        // 0,2 are close, 1 has issue
        return 1;
    }

    if (outOfRange(price02[0], price02[1])) {
        // 0,1 are close and 0,2 has issue => 2 has issue
        return 2;
    }

    if (outOfRange(price12[0], price12[1])) {
        // 0,1 are close and 1,2 has issue => 2 has issue
        return 2;
    }
    return 4;
}

async function curvePriceCheck(providerKey, walletKey) {
    const stabeCoins = await getStabeCoins(providerKey, walletKey);
    await checkPriceUpdateInChainPrice(stabeCoins, providerKey, walletKey);
    const buoyInstance = getBuoy(providerKey, walletKey);
    const price01 = await buoyInstance.getRatio(0, 1);
    const price02 = await buoyInstance.getRatio(0, 2);
    const price12 = await buoyInstance.getRatio(1, 2);
    logger.info(`price01 ${price01}`);
    logger.info(`price02 ${price02}`);
    logger.info(`price12 ${price12}`);
    const coinIndex = findBrokenToken(price01, price02, price12);
    logger.info(`coinIndex ${coinIndex}`);
    if (coinIndex > 3) {
        await getController(providerKey, walletKey)
            .emergency(coinIndex)
            .catch((error) => {
                handleError(error, {
                    curveCheck: {
                        message: 'Call stop function to stop system failed',
                    },
                });
            });
    }
    curvePriceMessage({ needStop: coinIndex < 4, abnormalIndex: coinIndex });
    const safetyCheck = true;
    return safetyCheck;
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

async function strategyCheck(providerKey, walletKey) {
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
    const msgLabel = [];
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
        await getController(providerKey, walletKey)
            .pause()
            .catch((error) => {
                handleError(error, {
                    strategyCheck: {
                        message: 'Call pause function to pause system failed',
                    },
                });
            });
    }

    strategyCheckMessage({ failedNumber: strategyFailedTotal });
    return strategyFailedTotal;
}

module.exports = {
    curvePriceCheck,
    strategyCheck,
};
