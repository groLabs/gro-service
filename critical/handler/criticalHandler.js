const { BigNumber } = require('ethers');
const { ethers } = require('ethers');
const BN = require('bignumber.js');
const {
    getBuoy,
    getChainPrice,
    getController,
} = require('../../contract/allContracts');

const { ContractCallError } = require('../../common/error');

const {
    sendMessageToCriticalEventChannel,
    MESSAGE_TYPES,
} = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const {
    getCurrentBlockNumber,
    getNonceManager,
} = require('../../common/chainUtil');
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

async function getStabeCoins() {
    const stabeCoins = await getController()
        .stablecoins()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                'Get underlyingTokens failed',
                MESSAGE_TYPES.curveCheck
            );
        });
    return stabeCoins;
}

async function curveCheck() {
    const stabeCoins = await getStabeCoins();
    const safetyCheck = await getBuoy().safetyCheck();
    let stopFlag = false;
    if (!safetyCheck) {
        const checkPromise = [];
        for (let i = 0; i < stabeCoins.length; i += 1) {
            checkPromise.push(getChainPrice().priceUpdateCheck(stabeCoins[i]));
        }
        const checkResult = await Promise.all(checkPromise);
        const updateRatioPromise = [];
        stopFlag = true;
        for (let i = 0; i < checkResult.length; i += 1) {
            if (!checkResult[i]) {
                stopFlag = false;
                updateRatioPromise.push(
                    getChainPrice().updateTokenRatios(stabeCoins[i])
                );
            }
        }
        if (stopFlag) {
            await getController().stop();
        } else {
            await Promise.all(updateRatioPromise);
            const safetyCheckAgain = await getBuoy().safetyCheck();
            if (!safetyCheckAgain) {
                stopFlag = true;
                await getController().stop();
            }
        }
    }

    let msg = `Curve price check is ${stopFlag}`;
    if (stopFlag) {
        msg = `Curve price check is ${stopFlag}, set system to **Stop** status`;
    }
    sendMessageToCriticalEventChannel({
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    });
    return stopFlag;
}

async function checkSingleStrategy(
    strategyAddress,
    method,
    beforeBlockNumber,
    failedPercentage,
    decimal = 4
) {
    let failed = 0;
    decimal = getConfig('failed_percentage_decimal', false) || decimal;
    const strategy = new ethers.Contract(
        strategyAddress,
        dependencyStrategyABI,
        nonceManager
    );
    const currentSharePrice = await strategy[method]();
    const preSharePrice = await strategy[method]({
        blockTag: beforeBlockNumber,
    });

    const changeValue = currentSharePrice.sub(preSharePrice);
    if (changeValue.lt(BigNumber.from(0))) {
        const changeValueABS = changeValue.abs();
        const percentage = BN(changeValueABS.toString()).div(
            BN(currentSharePrice.toString()).multipliedBy(BN(10).pow(decimal))
        );
        if (percentage.gt(BN(failedPercentage))) {
            failed = 1;
        }
    }
    return failed;
}

async function strategyCheck() {
    // Harvest strategy check
    const currentBlockNumber = await getCurrentBlockNumber();
    const beforeBlockNumber = currentBlockNumber - beforeBlock;
    let strategyFailedTotal = 0;
    let continueCheck = true;
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
            // full stop system
            // eslint-disable-next-line no-await-in-loop
            await getController().handbreakUp();
            continueCheck = false;
            break;
        }
    }

    // Cream strategy check
    if (continueCheck) {
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
                // full stop system
                // eslint-disable-next-line no-await-in-loop
                await getController().handbreakUp();
                continueCheck = false;
                break;
            }
        }
    }

    if (continueCheck) {
        // XPool strategy check
        const xpoolStrategyResult = await checkSingleStrategy(
            curvePoolStrategy.yearn,
            'getPricePerFullShare',
            perPriceFailedPercentage,
            beforeBlockNumber
        );

        strategyFailedTotal += xpoolStrategyResult;
        if (xpoolStrategyResult) {
            msgLabel.push({
                name: 'Xpool Yearn',
                address: curvePoolStrategy.yearn,
            });
        }
        if (strategyFailedTotal > 1) {
            continueCheck = false;
        }
    }

    let msg = 'All strategies are healthy';
    if (strategyFailedTotal === 1) {
        await getController().pause();
        msg = 'Have one abnormal strategy, and the system enters stop status';
    } else if (strategyFailedTotal > 1) {
        await getController().handbreakUp();
        msg =
            'At least 2 strategies are abnormal, and the system enters full stop status';
    }

    sendMessageToCriticalEventChannel({
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    });
    return strategyFailedTotal;
}

module.exports = {
    curveCheck,
    strategyCheck,
};
