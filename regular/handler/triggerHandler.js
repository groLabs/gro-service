'use strict';

const { BigNumber } = require('ethers');
const {
    getInsurance,
    getPnl,
    getVaults,
    getStrategyLength,
} = require('../../contract/allContracts');
const { pendingTransactions } = require('../../common/storage');
const {
    sendMessage,
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
} = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const logger = require('../../common/logger');
const config = require('config');
const NONEED_TRIGGER = { needCall: false };

const investTrigger = async function () {
    if (pendingTransactions.get('invest')) {
        const result = `Already has pending invest transaction: ${pendingTransactions.get(
            'invest'
        )}`;
        logger.info(result);
        sendMessage(DISCORD_CHANNELS.botLogs, {
            result,
            type: MESSAGE_TYPES.investTrigger,
            timestamp: new Date(),
        });
        return NONEED_TRIGGER;
    }
    const investParams = await getInsurance()
        .investTrigger()
        .catch((error) => {
            logger.error(error);
            sendMessage(DISCORD_CHANNELS.botAlerts, {
                result: 'Failed: call invest trigger.',
                type: MESSAGE_TYPES.investTrigger,
                timestamp: new Date(),
            });
            return [];
        });
    logger.info(`invest trigger: ${JSON.stringify(investParams)}`);
    sendMessage(DISCORD_CHANNELS.protocolEvents, {
        result: investParams,
        type: MESSAGE_TYPES.investTrigger,
        timestamp: new Date(),
    });
    if (investParams.length) {
        return {
            needCall: true,
            params: investParams,
        };
    }
    return NONEED_TRIGGER;
};

const checkVaultStrategyHarvest = function (vault, vaultIndex, strategyLength) {
    let promises = [];
    for (let i = 0; i < strategyLength; i++) {
        const key = `harvest-${vault.address}-${i}`;

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

        promises.push(
            vault
                .strategyHarvestTrigger(i, callCost)
                .then((resolve, reject) => {
                    logger.info(`success ${vault.address} ${i} ${resolve}`);
                    return {
                        vault: vault,
                        strategyIndex: i,
                        callCost,
                        triggerResponse: resolve,
                    };
                })
        );
    }
    return promises;
};

const harvestTrigger = async function () {
    const vaults = getVaults();
    const vaultsStrategyLength = getStrategyLength();
    //console.log(`vaults: ${JSON.stringify(vaults)}`)
    if (vaults.length == 0) {
        logger.info('Not fund any vault.');
        return NONEED_TRIGGER;
    }

    let strategyHarvestTrigger = [];
    let harvestPromises = [];
    for (let i = 0; i < vaults.length; i++) {
        logger.info(`vault: ${i} : ${vaults[i].address}`);
        let vaultPromises = checkVaultStrategyHarvest(
            ...strategyHarvestTrigger,
            vaults[i],
            i,
            vaultsStrategyLength[i]
        );
        harvestPromises.push(...vaultPromises);
    }

    let triggerResponses = await Promise.all(harvestPromises);
    triggerResponses.forEach((resp) => {
        //console.log(resp);
        if (resp.triggerResponse) {
            strategyHarvestTrigger.push(resp);
        }
    });

    if (strategyHarvestTrigger.length)
        return {
            needCall: true,
            params: strategyHarvestTrigger,
        };
    return NONEED_TRIGGER;
};

const harvestOneTrigger = async function () {
    const vaults = getVaults();
    if (vaults.length == 0) {
        logger.info('Not fund any vault.');
        return NONEED_TRIGGER;
    }

    const vaultsStrategyLength = getStrategyLength();
    for (let i = 0; i < vaults.length; i++) {
        logger.info(`vault: ${i} : ${vaults[i].address}`);
        const vault = vaults[i];
        const strategyLength = vaultsStrategyLength[i];
        for (let j = 0; j < strategyLength; j++) {
            const key = `harvest-${vault.address}-${j}`;

            if (pendingTransactions.get(key)) {
                const result = 'Already has pending harvest transaction.';
                logger.info(result);
                sendMessage(DISCORD_CHANNELS.botLogs, {
                    result,
                    type: MESSAGE_TYPES.harvestTrigger,
                    timestamp: new Date(),
                    params: `vault: ${vault.address} strategy index: ${j}`,
                });
                return NONEED_TRIGGER;
            }

            // Get harvest callCost
            const callCostKey = `harvest_callcost.vault_${i}.strategy_${j}`;
            let callCost = getConfig(callCostKey, false) || 0;
            callCost = BigNumber.from(callCost);
            const result = await vault
                .strategyHarvestTrigger(j, callCost)
                .catch((error) => {
                    logger.error(error);
                    sendMessage(DISCORD_CHANNELS.botAlerts, {
                        result: 'Failed: call strategyHarvestTrigger.',
                        type: MESSAGE_TYPES.harvestTrigger,
                        timestamp: new Date(),
                        params: {
                            callCost,
                            vault: vault.address,
                            strategyIndex: j,
                        },
                    });
                    return false;
                });
            logger.info(
                `vault:${i} strategy:${j} strategyHarvestTrigger: ${result}`
            );
            sendMessage(DISCORD_CHANNELS.protocolEvents, {
                result,
                type: MESSAGE_TYPES.harvestTrigger,
                timestamp: new Date(),
                params: {
                    callCost,
                    vault: vault.address,
                    strategyIndex: j,
                },
            });
            if (result)
                return {
                    needCall: true,
                    params: [
                        {
                            vault: vault,
                            strategyIndex: j,
                            callCost,
                            triggerResponse: result,
                        },
                    ],
                };
        }
    }
    return NONEED_TRIGGER;
};

const pnlTrigger = async function () {
    if (pendingTransactions.get('pnl')) {
        const result = 'Already has pending pnl transaction.';
        logger.info(result);
        sendMessage(DISCORD_CHANNELS.botLogs, {
            result,
            type: MESSAGE_TYPES.pnlTrigger,
            timestamp: new Date(),
        });
        return NONEED_TRIGGER;
    }

    const needPnl = await getPnl()
        .pnlTrigger()
        .catch((error) => {
            logger.error(error);
            sendMessage(DISCORD_CHANNELS.botAlerts, {
                result: 'Failed: call pnl trigger.',
                type: MESSAGE_TYPES.pnlTrigger,
                timestamp: new Date(),
            });
            return false;
        });
    logger.info(`pnl trigger. ${needPnl}`);
    sendMessage(DISCORD_CHANNELS.protocolEvents, {
        result: needPnl,
        type: MESSAGE_TYPES.pnlTrigger,
        timestamp: new Date(),
    });
    if (needPnl) {
        return {
            needCall: true,
        };
    }

    return NONEED_TRIGGER;
};

const rebalanceTrigger = async function () {
    if (pendingTransactions.get('rebalance')) {
        const result = 'Already has pending rebalance transaction.';
        logger.info(result);
        sendMessage(DISCORD_CHANNELS.botLogs, {
            result,
            type: MESSAGE_TYPES.rebalanceTrigger,
            timestamp: new Date(),
        });
        return NONEED_TRIGGER;
    }
    if (pendingTransactions.get('topup')) {
        const result = 'Already has pending topup transaction.';
        logger.info(result);
        sendMessage(DISCORD_CHANNELS.botLogs, {
            result,
            type: MESSAGE_TYPES.rebalanceTrigger,
            timestamp: new Date(),
        });
        return NONEED_TRIGGER;
    }

    const needRebalance = await getInsurance()
        .rebalanceTrigger()
        .catch((error) => {
            logger.error(error);
            sendMessage(DISCORD_CHANNELS.botAlerts, {
                result: 'Failed: call rebalance trigger.',
                type: MESSAGE_TYPES.rebalanceTrigger,
                timestamp: new Date(),
            });
            return [];
        });
    logger.info(`needRebalance: ${needRebalance}`);
    sendMessage(DISCORD_CHANNELS.protocolEvents, {
        result: needRebalance,
        type: MESSAGE_TYPES.rebalanceTrigger,
        timestamp: new Date(),
    });
    if (needRebalance.length && (needRebalance[0] || needRebalance[1])) {
        return {
            needCall: true,
            params: needRebalance,
        };
    }
    return NONEED_TRIGGER;
};

const callTriggers = async function () {
    let triggerPromises = [];
    triggerPromises.push(investTrigger());
    triggerPromises.push(harvestTrigger());
    triggerPromises.push(pnlTrigger());
    triggerPromises.push(rebalanceTrigger());
    const triggerResult = await Promise.all(triggerPromises).catch((error) => {
        logger.error(error);
        return [];
    });
    return triggerResult;
};

module.exports = {
    investTrigger,
    harvestTrigger,
    harvestOneTrigger,
    pnlTrigger,
    rebalanceTrigger,
    callTriggers,
};
