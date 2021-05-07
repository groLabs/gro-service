const { BigNumber } = require('ethers');
const { ethers } = require('ethers');
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

async function checkPriceUpdateInChainPrice(stabeCoins) {
    const checkPromise = [];
    for (let i = 0; i < stabeCoins.length; i += 1) {
        checkPromise.push(getChainPrice().priceUpdateCheck(stabeCoins[i]));
    }
    const checkResult = await Promise.all(checkPromise);
    const updateRatioPromise = [];
    for (let i = 0; i < checkResult.length; i += 1) {
        logger.info(`checkResult ${i}, ${checkResult[i]}`);
        if (checkResult[i]) {
            updateRatioPromise.push(
                await getChainPrice().updateTokenRatios(stabeCoins[i])
            );
        }
    }
    await Promise.all(updateRatioPromise);
}

async function curvePriceCheck() {
    const stabeCoins = await getStabeCoins();
    await checkPriceUpdateInChainPrice(stabeCoins);
    const safetyCheck = await getBuoy().safetyCheck();
    logger.info(`safetyCheck ${safetyCheck}`);
    let msg = `Curve price check is ${safetyCheck}`;
    if (!safetyCheck) {
        await getController().stop();
        msg = `Curve price check is ${safetyCheck}, set system to **Stop** status`;
    }
    sendMessageToCriticalEventChannel({
        message: msg,
        type: MESSAGE_TYPES.curveCheck,
        description: msg,
    });
    return safetyCheck;
}

async function checkSingleStrategy(
    strategyAddress,
    method,
    failedPercentage,
    beforeBlockNumber,
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
    const currentBlockNumber = await getCurrentBlockNumber();
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
    curvePriceCheck,
    strategyCheck,
};
