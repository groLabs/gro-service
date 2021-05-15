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
    getNonceManager,
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
const nonceManager = getNonceManager();

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

async function getStabeCoins() {
    const stabeCoins = await getController()
        .stablecoins()
        .catch((error) => {
            handleError(error, {
                curveCheck: { message: 'Get underlyingTokens failed' },
            });
        });
    return stabeCoins;
}

async function checkPriceUpdateInChainPrice(stabeCoins) {
    for (let i = 0; i < stabeCoins.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const checkResult = await getChainPrice()
            .priceUpdateCheck(stabeCoins[i])
            .catch((error) => {
                handleError(error, {
                    curveCheck: {
                        message: 'Call priceUpdateCheck failed',
                    },
                });
            });
        logger.info(`stabeCoins ${i}, ${checkResult}`);
        if (checkResult) {
            // eslint-disable-next-line no-await-in-loop
            await getChainPrice()
                .updateTokenRatios(stabeCoins[i])
                .catch((error) => {
                    handleError(error, {
                        curveCheck: {
                            message: 'Call updateTokenRatios failed',
                        },
                    });
                });
        }
    }
}

async function curvePriceCheck() {
    const stabeCoins = await getStabeCoins();
    await checkPriceUpdateInChainPrice(stabeCoins);
    const safetyCheck = await getBuoy()
        .safetyCheck()
        .catch((error) => {
            handleError(error, {
                curveCheck: {
                    message: "Call Buoy's safetyCheck failed",
                },
            });
        });
    logger.info(`safetyCheck ${safetyCheck}`);
    if (!safetyCheck) {
        await getController()
            .stop()
            .catch((error) => {
                handleError(error, {
                    curveCheck: {
                        message: 'Call stop function to stop system failed',
                    },
                });
            });
    }
    curvePriceMessage({ isSafety: safetyCheck });
    return safetyCheck;
}

async function checkSingleStrategy(
    strategyAddress,
    method,
    failedPercentage,
    beforeBlockNumber
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

async function strategyCheck() {
    // Harvest strategy check
    const currentBlockNumber = await getCurrentBlockNumber().catch((error) => {
        handleError(error, {
            strategyCheck: {
                message: 'Get current block number failed',
            },
        });
    });
    const beforeBlockNumber = currentBlockNumber - beforeBlock;
    let strategyFailedTotal = 0;
    const msgLabel = [];
    for (let i = 0; i < harvestStrategies.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const harvestStrategyResult = await checkSingleStrategy(
            harvestStrategies[i],
            'getPricePerFullShare',
            perPriceFailedPercentage,
            beforeBlockNumber
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
    if (strategyFailedTotal < 2) {
        for (let i = 0; i < creamStrategies.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const creamStrategyResult = await checkSingleStrategy(
                creamStrategies[i],
                'totalReserves',
                totalFailedPercentage,
                beforeBlockNumber
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

    if (strategyFailedTotal < 2) {
        // XPool strategy check
        const xPoolStrategyResult = await checkSingleStrategy(
            curvePoolStrategy.yearn,
            'getPricePerFullShare',
            perPriceFailedPercentage,
            beforeBlockNumber
        );

        strategyFailedTotal += xPoolStrategyResult;
        if (xPoolStrategyResult) {
            msgLabel.push({
                name: 'Xpool Yearn',
                address: curvePoolStrategy.yearn,
            });
        }
    }

    if (strategyFailedTotal === 1) {
        await getController()
            .pause()
            .catch((error) => {
                handleError(error, {
                    strategyCheck: {
                        message: 'Call pause function to pause system failed',
                    },
                });
            });
    } else if (strategyFailedTotal > 1) {
        await getController()
            .handbreakUp()
            .catch((error) => {
                handleError(error, {
                    strategyCheck: {
                        message:
                            'Call handbreakUp function to full stop system failed',
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
