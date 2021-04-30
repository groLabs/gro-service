const { BigNumber } = require('ethers');
const config = require('config');
const {
    getInsurance,
    getPnl,
    getLifeguard,
    getVaults,
    getCurveVault,
    getStrategyLength,
    getVaultAndStrategyLabels,
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
} = require('../../common/error');
const logger = require('../regularLogger');

const NONEED_TRIGGER = { needCall: false };

async function adapterInvestTrigger(vault) {
    if (pendingTransactions.get(`invest-${vault.address}`)) {
        const result = `Already has pending invest in adapter:${
            vault.address
        } transaction: ${pendingTransactions.get('invest').hash}`;
        logger.info(result);
        throw new PendingTransactionError(result, MESSAGE_TYPES.investTrigger);
    }
    const vaultName = getVaultAndStrategyLabels()[vault.address].name;
    const investTriggerResult = await vault.investTrigger().catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Call investTrigger of ${vaultName} : ${vault.address} to check if the adapter need investment failed`
        );
    });
    const msgObj = {
        type: MESSAGE_TYPES.investTrigger,
        message: `${vaultName} : ${vault.address} doesn't need invest.`,
        description: `${vaultName}'s investTrigger is false, doesn't need run invest`,
    };
    if (investTriggerResult) {
        msgObj.message = `${vaultName} : ${vault.address} need invest.`;
        msgObj.description = `${vaultName}'s investTrigger is true, need run invest`;
    }
    msgObj.urls = [];
    msgObj.urls.push({
        label: vaultName,
        type: 'account',
        value: vault.address,
    });
    logger.info(
        `${vaultName} : ${vault.address} invest trigger: ${investTriggerResult}`
    );
    sendMessageToProtocolEventChannel(msgObj);
    return investTriggerResult;
}

async function investTrigger() {
    const vaults = getVaults();
    if (vaults.length === 0) {
        logger.error('Not fund any vault.');
        throw new ContractCallError(
            'Try to call investTrigger function but not found any vaults.',
            MESSAGE_TYPES.investTrigger
        );
    }
    const triggerPromises = [];
    for (let i = 0; i < vaults.length - 1; i += 1) {
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
}

function checkVaultStrategyHarvest(vault, vaultIndex, strategyLength) {
    const promises = [];
    for (let i = 0; i < strategyLength; i += 1) {
        const key = `harvest-${vault.address}-${i}`;

        if (pendingTransactions.get(key)) {
            const msg = `Already has pending harvest:${key} transaction: ${
                pendingTransactions.get(key).hash
            }`;
            logger.info(msg);
        } else {
            // Get harvest callCost
            let callCost = BigNumber.from(0);
            const callCostKey = `harvest_callcost.vault_${vaultIndex}.strategy_${i}`;
            if (config.has(callCostKey)) {
                callCost = BigNumber.from(config.get(callCostKey));
            }

            promises.push(
                vault.strategyHarvestTrigger(i, callCost).then((resolve) => {
                    logger.info(`success ${vault.address} ${i} ${resolve}`);
                    return {
                        vault,
                        strategyIndex: i,
                        callCost,
                        triggerResponse: resolve,
                    };
                })
            );
        }
    }
    return promises;
}

async function harvestTrigger() {
    const vaults = getVaults();
    const vaultsStrategyLength = getStrategyLength();
    if (vaults.length === 0) {
        logger.error('Not fund any vault.');
        throw new ContractCallError(
            'Try to call investTrigger function but not found any vaults.',
            MESSAGE_TYPES.investTrigger
        );
    }

    const strategyHarvestTrigger = [];
    const harvestPromises = [];
    for (let i = 0; i < vaults.length; i += 1) {
        logger.info(`vault: ${i} : ${vaults[i].address}`);
        const vaultPromises = checkVaultStrategyHarvest(
            ...strategyHarvestTrigger,
            vaults[i],
            i,
            vaultsStrategyLength[i]
        );
        harvestPromises.push(...vaultPromises);
    }

    const triggerResponses = await Promise.all(harvestPromises);
    triggerResponses.forEach((resp) => {
        if (resp.triggerResponse) {
            strategyHarvestTrigger.push(resp);
        }
    });

    if (strategyHarvestTrigger.length) {
        return {
            needCall: true,
            params: strategyHarvestTrigger,
        };
    }

    return NONEED_TRIGGER;
}

async function harvestOneTrigger() {
    const vaults = getVaults();
    if (vaults.length === 0) {
        logger.info('Not fund any vault.');
        throw new ContractCallError(
            'Try to call investTrigger function but not found any vaults.',
            MESSAGE_TYPES.investTrigger
        );
    }

    const vaultsStrategyLength = getStrategyLength();
    for (let i = 0; i < vaults.length; i += 1) {
        const adapterAddress = vaults[i].address;
        const vaultName = getVaultAndStrategyLabels()[adapterAddress].name;
        const strategLabel = getVaultAndStrategyLabels()[adapterAddress]
            .strategies;
        logger.info(`${vaultName}: ${adapterAddress}`);
        const vault = vaults[i];
        const strategyLength = vaultsStrategyLength[i];
        for (let j = 0; j < strategyLength; j += 1) {
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
            // eslint-disable-next-line no-await-in-loop
            const result = await vault
                .strategyHarvestTrigger(j, callCost)
                .catch((error) => {
                    logger.error(error);
                    throw new ContractCallError(
                        `Call ${vaultName}:${vault.address}'s strategyHarvestTrigger function on ${strategLabel[j].name} with callCost: ${callCost} failed.`,
                        MESSAGE_TYPES.investTrigger
                    );
                });
            logger.info(
                `${vaultName}:${i} ${strategLabel[j].name} strategyHarvestTrigger: ${result}`
            );
            if (result) {
                sendMessageToProtocolEventChannel({
                    type: MESSAGE_TYPES.harvestTrigger,
                    message: `${vaultName}:${vault.address}'s ${strategLabel[j].name} strategy need harvest.`,
                    description: `${vaultName}'s harvestTrigger on ${strategLabel[j].name} is true, need run harvest`,
                    urls: [
                        {
                            label: vaultName,
                            type: 'account',
                            value: vault.address,
                        },
                        {
                            label: strategLabel[j].name,
                            type: 'account',
                            value: strategLabel[j].address,
                        },
                    ],
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
                            vault,
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
        message: 'No any strategies need harvest.',
        description: 'No any strategies need harvest',
        type: MESSAGE_TYPES.harvestTrigger,
    });
    return NONEED_TRIGGER;
}

async function pnlTrigger() {
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
                'Call pnlTrigger to check if the system need execute pnl failed.',
                MESSAGE_TYPES.pnlTrigger
            );
        });
    logger.info(`pnlTrigger. ${needPnlVault}`);
    const msgObj = {
        type: MESSAGE_TYPES.pnlTrigger,
        message: 'No need run PnL.',
        description:
            "PnlTrigger and totalAssetsChangeTrigger are both false, doesn't need run Pnl",
    };
    let pnlTriggerResult = NONEED_TRIGGER;
    if (!needPnlVault) {
        const needPnlAssets = await getPnl()
            .totalAssetsChangeTrigger()
            .catch((error) => {
                logger.error(error);
                throw new ContractCallError(
                    'Call totalAssetsChangeTrigger to check if the system need execute pnl failed.',
                    MESSAGE_TYPES.pnlTrigger
                );
            });

        logger.info(`totalAssetsChangeTrigger. ${needPnlAssets}`);
        if (needPnlAssets) {
            pnlTriggerResult = {
                needCall: true,
            };
            msgObj.message = 'TotalAssetsChangeTrigger is true, need run Pnl';
            msgObj.description =
                'TotalAssetsChangeTrigger is true, need run Pnl';
        }
    } else {
        pnlTriggerResult = {
            needCall: true,
        };
        msgObj.message = 'PnlTrigger is true, need run Pnl';
        msgObj.description = 'PnlTrigger is true, need run Pnl';
    }

    sendMessageToProtocolEventChannel(msgObj);
    return pnlTriggerResult;
}

async function rebalanceTrigger() {
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
    logger.info(`rebalanceTrigger: ${needRebalance}`);
    const msgObj = {
        message: 'No need run rebalance.',
        description: "RebalanceTrigger is false, doesn't need run rebalance",
        type: MESSAGE_TYPES.rebalanceTrigger,
    };
    let rebalanceTriggerResult = NONEED_TRIGGER;
    if (needRebalance) {
        rebalanceTriggerResult = {
            needCall: true,
        };
        msgObj.message = 'Need run rebalance to adjust the system asset.';
        msgObj.description = 'RebalanceTrigger is true, need run rebalance';
    }
    sendMessageToProtocolEventChannel(msgObj);
    return rebalanceTriggerResult;
}

async function curveInvestTrigger() {
    if (pendingTransactions.get('curveInvest')) {
        const result = `Already has pending Curve invest transaction: ${
            pendingTransactions.get('curveInvest').hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(
            result,
            MESSAGE_TYPES.curveInvestTrigger
        );
    }

    const needInvest = await getLifeguard()
        .investToCurveVaultTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                'Call investToCurveVaultTrigger function failed.',
                MESSAGE_TYPES.curveInvestTrigger
            );
        });
    logger.info(`curveInvestTrigger : ${needInvest}`);
    const curveVaultAddress = getCurveVault().address;
    const vaultName = getVaultAndStrategyLabels()[curveVaultAddress].name;
    const msgObj = {
        type: MESSAGE_TYPES.curveInvestTrigger,
        message: 'No need run curve invest.',
        description: `${vaultName}'s curveInvestTrigger is false, doesn't need run curve invest`,
    };

    let investResult = NONEED_TRIGGER;
    if (needInvest) {
        investResult = { needCall: true };
        msgObj.message = `${vaultName}'s curveInvestTrigger is true, need run invest`;
        msgObj.description = `${vaultName}'s curveInvestTrigger is true, need run invest`;
    }
    msgObj.urls = [];
    msgObj.urls.push({
        label: vaultName,
        type: 'account',
        value: curveVaultAddress,
    });
    sendMessageToProtocolEventChannel(msgObj);
    return investResult;
}

async function callTriggers() {
    const triggerPromises = [];
    triggerPromises.push(investTrigger());
    triggerPromises.push(harvestTrigger());
    triggerPromises.push(pnlTrigger());
    triggerPromises.push(rebalanceTrigger());
    triggerPromises.push(curveInvestTrigger());
    const triggerResult = await Promise.all(triggerPromises);
    return triggerResult;
}

module.exports = {
    investTrigger,
    harvestTrigger,
    harvestOneTrigger,
    pnlTrigger,
    rebalanceTrigger,
    curveInvestTrigger,
    callTriggers,
};
