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
    sendMessageToProtocolEventChannel,
    MESSAGE_TYPES,
} = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const {
    PendingTransactionError,
    ContractCallError,
} = require('../../common/customErrors');
const logger = require('../regularLogger');
const config = require('config');
const NONEED_TRIGGER = { needCall: false };

const investTrigger = async function () {
    if (pendingTransactions.get('invest')) {
        const result = `Already has pending invest transaction: ${
            pendingTransactions.get('invest').hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(result, MESSAGE_TYPES.investTrigger);
    }
    const investParams = await getInsurance()
        .investTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                'Call investTrigger function to check if the system need investment failed'
            );
        });
    let msgObj = {
        message: 'No need invest.',
        type: MESSAGE_TYPES.investTrigger,
        params: [],
    };

    let investTriggerResult = NONEED_TRIGGER;

    if (investParams.length) {
        investTriggerResult = {
            needCall: true,
            params: investParams,
        };
        let paramsMsg = '';
        investParams.forEach((item) => {
            paramsMsg += `${item.toString()}, `;
        });
        msgObj.message = `Need invest with parameter: [${paramsMsg}]`;
        msgObj.params = `[${paramsMsg}]`;
    }
    logger.info(`invest trigger: ${msgObj.params}`);
    sendMessageToProtocolEventChannel(msgObj);
    return investTriggerResult;
};

const checkVaultStrategyHarvest = function (vault, vaultIndex, strategyLength) {
    let promises = [];
    for (let i = 0; i < strategyLength; i++) {
        const key = `harvest-${vault.address}-${i}`;

        if (pendingTransactions.get(key)) {
            const msg = `Already has pending harvest:${key} transaction: ${
                pendingTransactions.get(key).hash
            }`;
            logger.info(msg);
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
        logger.error('Not fund any vault.');
        throw new ContractCallError(
            'Try to call investTrigger function but not found any vaults.',
            MESSAGE_TYPES.investTrigger
        );
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
        throw new ContractCallError(
            'Try to call investTrigger function but not found any vaults.',
            MESSAGE_TYPES.investTrigger
        );
    }

    const vaultsStrategyLength = getStrategyLength();
    for (let i = 0; i < vaults.length; i++) {
        logger.info(`vault: ${i} : ${vaults[i].address}`);
        const vault = vaults[i];
        const strategyLength = vaultsStrategyLength[i];
        for (let j = 0; j < strategyLength; j++) {
            const key = `harvest-${vault.address}-${j}`;

            if (pendingTransactions.get(key)) {
                const result = `Already has pending harvest transaction: ${
                    pendingTransactions.get(key).hash
                }`;
                logger.info(result);
                throw new PendingTransactionError(
                    result,
                    MESSAGE_TYPES.investTrigger
                );
            }

            // Get harvest callCost
            const callCostKey = `harvest_callcost.vault_${i}.strategy_${j}`;
            let callCost = getConfig(callCostKey, false) || 0;
            callCost = BigNumber.from(callCost);
            const result = await vault
                .strategyHarvestTrigger(j, callCost)
                .catch((error) => {
                    logger.error(error);
                    throw new ContractCallError(
                        `Call vault:${vault.address}'s strategyHarvestTrigger function with strategy index:${j} and callCost: ${callCost} failed.`,
                        MESSAGE_TYPES.investTrigger
                    );
                });
            logger.info(
                `vault:${i} strategy:${j} strategyHarvestTrigger: ${result}`
            );
            if (result) {
                sendMessageToProtocolEventChannel({
                    message: `vault:${vault.address}'s strategy ${j} need harvest.`,
                    type: MESSAGE_TYPES.harvestTrigger,
                    params: {
                        callCost: callCost.toString(),
                        vault: vault.address,
                        strategyIndex: j,
                    },
                });
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
    }
    sendMessageToProtocolEventChannel({
        message: `No any strategies need harvest.`,
        type: MESSAGE_TYPES.harvestTrigger,
    });
    return NONEED_TRIGGER;
};

const pnlTrigger = async function () {
    if (pendingTransactions.get('pnl')) {
        const result = `Already has pending pnl transaction: ${
            pendingTransactions.get('pnl').hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(result, MESSAGE_TYPES.pnlTrigger);
    }

    const needPnl = await getPnl()
        .pnlTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Call pnlTrigger to check if the system need execute pnl failed.`,
                MESSAGE_TYPES.pnlTrigger
            );
        });
    logger.info(`pnl trigger. ${needPnl}`);
    let msgObj = {
        message: 'No need run PnL.',
        type: MESSAGE_TYPES.pnlTrigger,
    };
    let pnlTriggerResult = NONEED_TRIGGER;
    if (needPnl) {
        pnlTriggerResult = {
            needCall: true,
        };
        msgObj.message = 'Need run Pnl.';
    }

    sendMessageToProtocolEventChannel(msgObj);
    return pnlTriggerResult;
};

const rebalanceTrigger = async function () {
    if (pendingTransactions.get('rebalance')) {
        const result = `Already has pending rebalance transaction: ${
            pendingTransactions.get('rebalance').hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(
            result,
            MESSAGE_TYPES.rebalanceTrigger
        );
    }
    if (pendingTransactions.get('topup')) {
        const result = `Already has pending topup transaction: ${
            pendingTransactions.get('rebalance').hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(
            result,
            MESSAGE_TYPES.rebalanceTrigger
        );
    }

    const needRebalance = await getInsurance()
        .rebalanceTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                'Call rebalanceTrigger function failed.',
                MESSAGE_TYPES.rebalanceTrigger
            );
        });
    logger.info(`needRebalance: ${needRebalance}`);
    let msgObj = {
        message: 'No need run rebalance or topup.',
        type: MESSAGE_TYPES.rebalanceTrigger,
    };
    let rebalanceTriggerResult = NONEED_TRIGGER;
    if (needRebalance.length && (needRebalance[0] || needRebalance[1])) {
        rebalanceTriggerResult = {
            needCall: true,
            params: needRebalance,
        };
        if (needRebalance[0]) {
            msgObj.message = 'Need run rebalance to adjust the system asset.';
        } else {
            msgObj.message = 'Need run topup to full up asset to lifeguard.';
        }
    }
    sendMessageToProtocolEventChannel(msgObj);
    return rebalanceTriggerResult;
};

const callTriggers = async function () {
    let triggerPromises = [];
    triggerPromises.push(investTrigger());
    triggerPromises.push(harvestTrigger());
    triggerPromises.push(pnlTrigger());
    triggerPromises.push(rebalanceTrigger());
    const triggerResult = await Promise.all(triggerPromises);
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
