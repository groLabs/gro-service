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
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const {
    PendingTransactionError,
    ContractCallError,
} = require('../../common/error');
const { investTriggerMessage } = require('../../discordMessage/investMessage');
const { pnlTriggerMessage } = require('../../discordMessage/pnlMessage');
const {
    rebalaneTriggerMessage,
} = require('../../discordMessage/rebalanceMessage');
const {
    harvestTriggerMessage,
} = require('../../discordMessage/harvestMessage');
const logger = require('../regularLogger');

const NONEED_TRIGGER = { needCall: false };

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

async function investTrigger() {
    const vaults = getVaults();
    if (vaults.length === 0) {
        logger.error('Not fund any vault.');
        throw new ContractCallError(
            'Not vaults found',
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
            'Not found any vaults',
            MESSAGE_TYPES.harvestTrigger
        );
    }

    const vaultsStrategyLength = getStrategyLength();
    for (let i = 0; i < vaults.length; i += 1) {
        const adapterAddress = vaults[i].address;
        const vaultName = getVaultAndStrategyLabels()[adapterAddress].name;
        const strategLabel = getVaultAndStrategyLabels()[adapterAddress]
            .strategies;
        logger.info(`${strategLabel}: ${JSON.stringify(strategLabel)}`);
        logger.info(`${vaultName}: ${adapterAddress}`);
        const vault = vaults[i];
        const strategyLength = vaultsStrategyLength[i];
        logger.info(`strategyLength: ${strategyLength}`);
        for (let j = 0; j < strategyLength; j += 1) {
            const key = `harvest-${vault.address}-${j}`;

            if (pendingTransactions.get(key)) {
                const result = `Already has pending harvest transaction: ${
                    pendingTransactions.get(key).hash
                }`;
                logger.info(result);
                throw new PendingTransactionError(
                    'Already has pending harvest transaction',
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
                    logger.error(
                        `Call ${vaultName}:${vault.address}'s strategyHarvestTrigger function on ${strategLabel[j].name} with callCost: ${callCost} failed.`
                    );
                    throw new ContractCallError(
                        `${vaultName}'s harvestTrigger call failed.`,
                        MESSAGE_TYPES.investTrigger
                    );
                });
            logger.info(
                `${vaultName}:${i} ${strategLabel[j].name} callCost: ${callCost} strategyHarvestTrigger: ${result}`
            );
            if (result) {
                harvestTriggerMessage([
                    {
                        vaultName,
                        vaultAddress: vault.address,
                        strategyName: strategLabel[j].name,
                        strategyAddress: strategLabel[j].address,
                    },
                ]);
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
    harvestTriggerMessage([]);
    return NONEED_TRIGGER;
}

async function pnlTrigger() {
    if (pendingTransactions.get('pnl')) {
        const result = `Already has pending Pnl transaction: ${
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
                'PnlTrigger call failed',
                MESSAGE_TYPES.pnlTrigger
            );
        });
    logger.info(`pnlTrigger: ${needPnlVault}`);
    let pnlTriggerResult = NONEED_TRIGGER;
    const messageContent = { pnlTrigger: needPnlVault, totalTrigger: false };
    if (!needPnlVault) {
        const needPnlAssets = await getPnl()
            .totalAssetsChangeTrigger()
            .catch((error) => {
                logger.error(error);
                throw new ContractCallError(
                    'TotalAssetsChangeTrigger call failed',
                    MESSAGE_TYPES.pnlTrigger
                );
            });
        messageContent.totalTrigger = needPnlAssets;
        logger.info(`totalAssetsChangeTrigger: ${needPnlAssets}`);
        if (needPnlAssets) {
            pnlTriggerResult = {
                needCall: true,
            };
        }
    } else {
        pnlTriggerResult = {
            needCall: true,
        };
    }

    pnlTriggerMessage(messageContent);
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
                'InvestToCurveVaultTrigger call failed.',
                MESSAGE_TYPES.curveInvestTrigger
            );
        });
    logger.info(`curveInvestTrigger : ${needInvest}`);
    const curveVaultAddress = getCurveVault().address;
    const vaultName = getVaultAndStrategyLabels()[curveVaultAddress].name;
    // const msgObj = {
    //     type: MESSAGE_TYPES.curveInvestTrigger,
    //     message: 'No need run curve invest.',
    //     description: `${vaultName}'s curveInvestTrigger is false, doesn't need run curve invest`,
    // };

    let investResult = NONEED_TRIGGER;
    if (needInvest) {
        investResult = { needCall: true };
        // msgObj.message = `${vaultName}'s curveInvestTrigger is true, need run invest`;
        // msgObj.description = `${vaultName}'s curveInvestTrigger is true, need run invest`;
    }
    // msgObj.urls = [];
    // msgObj.urls.push({
    //     label: vaultName,
    //     type: 'account',
    //     value: curveVaultAddress,
    // });
    // sendMessageToProtocolEventChannel(msgObj);

    investTriggerMessage({
        vaultName,
        vaultAddress: curveVaultAddress,
        isInvested: needInvest,
    });
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
