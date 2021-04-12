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

const adapterInvestTrigger = async function (vault) {
    if (pendingTransactions.get(`invest-${vault.address}`)) {
        const result = `Already has pending invest in adapter:${
            vault.address
        } transaction: ${pendingTransactions.get('invest').hash}`;
        logger.info(result);
        throw new PendingTransactionError(result, MESSAGE_TYPES.investTrigger);
    }
    const investTriggerResult = await vault.investTrigger().catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Call investTrigger of adapter: ${vault.address} to check if the adapter need investment failed`
        );
    });
    let msgObj = {
        message: `Adapter: ${vault.address} doesn't need invest.`,
        type: MESSAGE_TYPES.investTrigger,
    };
    if (investTriggerResult) {
        msgObj.message = `Adapter: ${vault.address} need invest.`;
    }
    logger.info(
        `Adapter:${vault.address} invest trigger: ${investTriggerResult}`
    );
    sendMessageToProtocolEventChannel(msgObj);
    return investTriggerResult;
};

const investTrigger = async function () {
    const vaults = getVaults();
    if (vaults.length == 0) {
        logger.error('Not fund any vault.');
        throw new ContractCallError(
            'Try to call investTrigger function but not found any vaults.',
            MESSAGE_TYPES.investTrigger
        );
    }
    let triggerPromises = [];
    for (let i = 0; i < vaults.length; i++) {
        triggerPromises.push(adapterInvestTrigger(vaults[i]));
    }
    const result = await Promise.all(triggerPromises);
    let investTriggerResult = NONEED_TRIGGER;
    if (result[0] || result[1] || result[2]) {
        investTriggerResult = {
            needCall: true,
            params: result,
        };
    }
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

    const needPnlVault = await getPnl()
        .pnlTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Call pnlTrigger to check if the system need execute pnl failed.`,
                MESSAGE_TYPES.pnlTrigger
            );
        });
    logger.info(`pnl trigger. ${needPnlVault}`);

    const needPnlAssets = await getPnl()
        .totalAssetsChangeTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Call totalAssetsChangeTrigger to check if the system need execute pnl failed.`,
                MESSAGE_TYPES.pnlTrigger
            );
        });

    logger.info(`totalAssetsChangeTrigger. ${needPnlAssets}`);

    let msgObj = {
        message: 'No need run PnL.',
        type: MESSAGE_TYPES.pnlTrigger,
    };
    let pnlTriggerResult = NONEED_TRIGGER;
    if (needPnlVault || needPnlAssets) {
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
        message: 'No need run rebalance.',
        type: MESSAGE_TYPES.rebalanceTrigger,
    };
    let rebalanceTriggerResult = NONEED_TRIGGER;
    if (needRebalance[0]) {
        rebalanceTriggerResult = {
            needCall: true,
        };
        msgObj.message = 'Need run rebalance to adjust the system asset.';
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
