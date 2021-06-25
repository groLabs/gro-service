const { BigNumber } = require('ethers');
const {
    getInsurance,
    getLifeguard,
    getVaults,
    getStrategyLength,
    getVaultAndStrategyLabels,
    getYearnVaults,
    getController,
} = require('../../contract/allContracts');
const { pendingTransactions } = require('../../common/storage');
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const {
    PendingTransactionError,
    ContractCallError,
} = require('../../common/error');
const { investTriggerMessage } = require('../../discordMessage/investMessage');
const {
    rebalaneTriggerMessage,
} = require('../../discordMessage/rebalanceMessage');
const {
    harvestTriggerMessage,
} = require('../../discordMessage/harvestMessage');
const logger = require('../regularLogger');

const NONEED_TRIGGER = { needCall: false };

async function isEmergencyState(messageType, providerKey, walletKey) {
    const controller = getController(providerKey, walletKey);
    const emergencyState = await controller.emergencyState().catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            "Get system's emergency state failed",
            messageType
        );
    });
    return emergencyState;
}
async function adapterInvestTrigger(vault) {
    const vaultName = getVaultAndStrategyLabels()[vault.address].name;
    if (pendingTransactions.get(`invest-${vault.address}`)) {
        const result = `Already has pending invest for ${vaultName}:${
            vault.address
        } transaction: ${
            pendingTransactions.get(`invest-${vault.address}`).hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(result, MESSAGE_TYPES.investTrigger);
    }
    const investTriggerResult = await vault.investTrigger().catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Call investTrigger of ${vaultName} : ${vault.address} to check if the adapter need investment failed`,
            MESSAGE_TYPES.investTrigger
        );
    });

    logger.info(
        `${vaultName} : ${vault.address} invest trigger: ${investTriggerResult}`
    );
    investTriggerMessage({
        vaultName,
        vaultAddress: vault.address,
        isInvested: investTriggerResult,
    });
    return investTriggerResult;
}

async function sortStrategyByLastHarvested(vaults) {
    if (vaults.length === 0) {
        logger.info('Not fund any vault.');
        throw new ContractCallError(
            'Not found any vaults',
            MESSAGE_TYPES.harvestTrigger
        );
    }

    const vaultsStrategyLength = getStrategyLength();
    const strategiesStatus = [];
    for (let i = 0; i < vaults.length; i += 1) {
        const adapterAddress = vaults[i].address;
        const vaultName = getVaultAndStrategyLabels()[adapterAddress].name;
        const strategLabel =
            getVaultAndStrategyLabels()[adapterAddress].strategies;
        logger.info(`${vaultName}: ${adapterAddress}`);
        const vault = vaults[i];
        const yearnVault = getYearnVaults()[i];
        const strategyLength = vaultsStrategyLength[i];
        logger.info(`strategyLength: ${strategyLength}`);
        for (let j = 0; j < strategyLength; j += 1) {
            // Get harvest callCost
            const callCostKey = `harvest_callcost.vault_${i}.strategy_${j}`;
            let callCost = getConfig(callCostKey, false) || 0;
            callCost = BigNumber.from(callCost);
            logger.info(`callCost ${j} ${callCost}`);

            // eslint-disable-next-line no-await-in-loop
            const triggerResult = await vault.strategyHarvestTrigger(
                j,
                callCost
            );
            logger.info(`triggerResult ${triggerResult}`);
            // eslint-disable-next-line no-await-in-loop
            const strategyParam = await yearnVault.strategies(
                strategLabel[j].address
            );
            logger.info(
                `strategyParam ${strategLabel[j].address} ${strategyParam}`
            );
            strategiesStatus.push({
                vaultIndex: i,
                strategyIndex: j,
                address: strategLabel[j].address,
                trigger: triggerResult,
                lastHarvest: strategyParam.lastReport,
            });
        }
    }
    const sorted = strategiesStatus.sort(
        (a, b) => a.lastHarvest - b.lastHarvest
    );
    return sorted;
}

async function investTrigger(providerKey, walletKey) {
    // emergency check
    const isEmergency = await isEmergencyState(
        MESSAGE_TYPES.investTrigger,
        providerKey,
        walletKey
    );
    if (isEmergency) {
        logger.info(
            'System is in emergency state, invest action will be paused.'
        );
        return NONEED_TRIGGER;
    }

    const vaults = getVaults(providerKey, walletKey);
    const triggerPromises = [];
    for (let i = 0; i < vaults.length - 1; i += 1) {
        triggerPromises.push(adapterInvestTrigger(vaults[i]));
    }
    triggerPromises.push(
        getLifeguard(providerKey, walletKey).investToCurveVaultTrigger()
    );
    const result = await Promise.all(triggerPromises);
    const strategies = await sortStrategyByLastHarvested(vaults);
    let needInvestIndex = -1;
    const orderedVaults = [];
    for (let i = 0; i < strategies.length; i += 1) {
        const { vaultIndex, strategyIndex, lastHarvest } = strategies[i];
        logger.info(
            `strategy ${vaultIndex}, ${strategyIndex}, ${lastHarvest}, ${result[vaultIndex]}`
        );
        if (strategies[i].trigger) {
            if (result[vaultIndex]) {
                logger.info(
                    `vault trigger check ${needInvestIndex} ${result[vaultIndex]}`
                );
                needInvestIndex = vaultIndex;
            }
            logger.info(`needInvestIndex ${needInvestIndex}`);
            break;
        } else if (!orderedVaults.includes(vaultIndex) && result[vaultIndex]) {
            orderedVaults.push(vaultIndex);
        }
    }
    if (orderedVaults.length > 0) {
        logger.info(`${orderedVaults.length}`);
        [needInvestIndex] = orderedVaults;
    }
    logger.info(`final needInvestIndex ${needInvestIndex}`);
    let investTriggerResult = NONEED_TRIGGER;
    if (needInvestIndex >= 0) {
        investTriggerResult = {
            needCall: true,
            params: needInvestIndex,
        };
    }
    return investTriggerResult;
}

// function checkVaultStrategyHarvest(vault, vaultIndex, strategyLength) {
//     const promises = [];
//     for (let i = 0; i < strategyLength; i += 1) {
//         const key = `harvest-${vault.address}-${i}`;

//         if (pendingTransactions.get(key)) {
//             const msg = `Already has pending harvest:${key} transaction: ${
//                 pendingTransactions.get(key).hash
//             }`;
//             logger.info(msg);
//         } else {
//             // Get harvest callCost
//             let callCost = BigNumber.from(0);
//             const callCostKey = `harvest_callcost.vault_${vaultIndex}.strategy_${i}`;
//             if (config.has(callCostKey)) {
//                 callCost = BigNumber.from(config.get(callCostKey));
//             }

//             promises.push(
//                 vault.strategyHarvestTrigger(i, callCost).then((resolve) => {
//                     logger.info(`success ${vault.address} ${i} ${resolve}`);
//                     return {
//                         vault,
//                         strategyIndex: i,
//                         callCost,
//                         triggerResponse: resolve,
//                     };
//                 })
//             );
//         }
//     }
//     return promises;
// }

async function harvestOneTrigger(providerKey, walletKey) {
    // emergency check
    const isEmergency = await isEmergencyState(
        MESSAGE_TYPES.harvestTrigger,
        providerKey,
        walletKey
    );
    if (isEmergency) {
        logger.info(
            'System is in emergency state, harvest action will be paused.'
        );
        return NONEED_TRIGGER;
    }

    const vaults = getVaults(providerKey, walletKey);
    const strategies = await sortStrategyByLastHarvested(vaults);
    for (let i = 0; i < strategies.length; i += 1) {
        const { vaultIndex, strategyIndex, trigger } = strategies[i];
        logger.info(
            `harvestOneTrigger ${vaultIndex} ${strategyIndex} ${trigger}`
        );
        if (trigger) {
            // Get harvest callCost
            const callCostKey = `harvest_callcost.vault_${vaultIndex}.strategy_${strategyIndex}`;
            let callCost = getConfig(callCostKey, false);
            callCost = BigNumber.from(callCost);
            return {
                needCall: true,
                params: {
                    vault: vaults[vaultIndex],
                    strategyIndex,
                    callCost,
                    triggerResponse: trigger,
                },
            };
        }
    }
    harvestTriggerMessage([]);
    return NONEED_TRIGGER;
}

async function rebalanceTrigger(providerKey, walletKey) {
    // emergency check
    const isEmergency = await isEmergencyState(
        MESSAGE_TYPES.rebalanceTrigger,
        providerKey,
        walletKey
    );
    if (isEmergency) {
        logger.info(
            'System is in emergency state, rebalance action will be paused.'
        );
        return NONEED_TRIGGER;
    }

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

    const needRebalance = await getInsurance(providerKey, walletKey)
        .rebalanceTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                'RebalanceTrigger call failed',
                MESSAGE_TYPES.rebalanceTrigger
            );
        });
    logger.info(`rebalanceTrigger: ${needRebalance}`);
    let rebalanceTriggerResult = NONEED_TRIGGER;
    if (needRebalance) {
        rebalanceTriggerResult = {
            needCall: true,
        };
    }
    rebalaneTriggerMessage({ isRebalance: needRebalance });
    return rebalanceTriggerResult;
}

module.exports = {
    investTrigger,
    harvestOneTrigger,
    rebalanceTrigger,
};
