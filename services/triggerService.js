'use strict';

const { BigNumber } = require('ethers');
const {
    investTrigger: callInvestTrigger,
    rebalanceTrigger: callRebalanceTrigger,
} = require('./contract/insurance');
const { getInsurance, getPnl } = require('./contract/controller');
const { pendingTransactions } = require('../common/storage');
const { getVaults } = require('./contract/controller');
const {
    strategiesLength,
    strategyHarvestTrigger,
} = require('./contract/vault');
const { pnlTrigger: callPnlTrigger } = require('./contract/pnl');
const logger = require('../common/logger');
const config = require('config');
const NONEED_TRIGGER = { needCall: false };
let insuranceAddress = undefined;
let pnlAddress = undefined;
let vaults = [];

getInsurance()
    .then((address) => {
        logger.info(`insuranceAddress initilized.`);
        insuranceAddress = address;
    })
    .catch((error) => {
        logger.error(error);
    });

getPnl()
    .then((address) => {
        logger.info(`pnlAddress initilized.`);
        pnlAddress = address;
    })
    .catch((error) => {
        logger.error(error);
    });

getVaults()
    .then((controllerVaults) => {
        logger.info(`vaults initilized.`);
        vaults = controllerVaults;
    })
    .catch((error) => {
        logger.error(error);
    });

const investTrigger = async function () {
    if (pendingTransactions.get('invest')) {
        logger.info('Already has pending invest transaction.');
        return NONEED_TRIGGER;
    }

    if (!insuranceAddress) {
        logger.info(`Not fund insurance address.`);
        return NONEED_TRIGGER;
    }

    const investParams = await callInvestTrigger(insuranceAddress);

    if (investParams.length) {
        return {
            needCall: true,
            params: investParams,
        };
    }
    return NONEED_TRIGGER;
};

const checkVaultStrategyHarvest = async function (vault, vaultIndex) {
    const strategyLength = await strategiesLength(vault);
    if (strategyLength == 0) {
        logger.info(`vault: ${vault} doesn't have any strategy.`);
        return [];
    }

    let harvestStrategies = [];
    for (let i = 0; i < strategyLength; i++) {
        const key = `harvest-${vault}-${i}`;

        if (pendingTransactions.get(key)) {
            logger.info(`Already has pending ${key} transaction.`);
            continue;
        }

        // Get harvest callCost
        let callCost = BigNumber.from(0);
        const callCostKey = `harvest_callcost.vault_${vaultIndex}.strategy_${i}`;
        if (config.has(callCostKey)) {
            callCost = BigNumber.from(config.get(callCostKey));
        }

        const triggerResponse = await strategyHarvestTrigger(
            vault,
            i,
            callCost
        );
        logger.info(`${key} harvest trigger returns: ${triggerResponse}`);

        if (triggerResponse) {
            harvestStrategies.push({ vault, strategyIndex: i, callCost });
            continue;
        }

        logger.info(`vault: ${vault} - strategy: ${i} doesn't need harvest.`);
    }
    return harvestStrategies;
};

const harvestTrigger = async function () {
    if (vaults.length == 0) {
        logger.info('Not fund any vault.');
        return NONEED_TRIGGER;
    }

    let strategyHarvestTrigger = [];
    for (let i = 0; i < vaults.length; i++) {
        logger.info(`vault: ${i} : ${vaults[i]}`);
        const harvestStrategies = await checkVaultStrategyHarvest(vaults[i], i);
        strategyHarvestTrigger.push(...harvestStrategies);
    }

    if (strategyHarvestTrigger.length)
        return {
            needCall: true,
            params: strategyHarvestTrigger,
        };
    return NONEED_TRIGGER;
};

const pnlTrigger = async function () {
    if (pendingTransactions.get('pnl')) {
        logger.info('Already has pending pnl transaction.');
        return NONEED_TRIGGER;
    }

    if (!pnlAddress) {
        logger.info(`Not fund pnl address.`);
        return NONEED_TRIGGER;
    }

    const needPnl = await callPnlTrigger(pnlAddress);

    if (needPnl) {
        return {
            needCall: true,
        };
    }

    return NONEED_TRIGGER;
};

const rebalanceTrigger = async function () {
    if (pendingTransactions.get('rebalance')) {
        logger.info('Already has pending rebalance transaction.');
        return NONEED_TRIGGER;
    }
    if (pendingTransactions.get('topup')) {
        logger.info('Already has pending topup transaction.');
        return NONEED_TRIGGER;
    }

    if (!insuranceAddress) {
        logger.info(`Not fund insurance address.`);
        return NONEED_TRIGGER;
    }

    const needRebalance = await callRebalanceTrigger(insuranceAddress);
    logger.info(`needRebalance: ${JSON.stringify(needRebalance)}`);
    if (needRebalance.length && (needRebalance[0] || needRebalance[1])) {
        return {
            needCall: true,
            params: needRebalance,
        };
    }
    return NONEED_TRIGGER;
};

module.exports = {
    investTrigger,
    harvestTrigger,
    pnlTrigger,
    rebalanceTrigger,
};
