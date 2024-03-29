import { BigNumber } from 'ethers';
import {
    getInsurance,
    getExposure,
    getLifeguard,
    getVaults,
    getStrategyLength,
    getVaultAndStrategyLabels,
    getYearnVaults,
    getController,
    getBuoy,
} from '../../contract/allContracts';
import { pendingTransactions } from '../../common/storage';
import { MESSAGE_TYPES } from '../../common/discord/discordService';
import { getConfig } from '../../common/configUtil';
import { PendingTransactionError, ContractCallError } from '../../common/error';
import { investTriggerMessage } from '../../discordMessage/investMessage';
import { rebalanceTriggerMessage } from '../../discordMessage/rebalanceMessage';
import { harvestTriggerMessage } from '../../discordMessage/harvestMessage';
import { distributeCurveVaultTriggerMessage } from '../../discordMessage/distributeCurveMessage';

const logger = require('../regularLogger');
// - dai primary: -1500
// - dai seecondary: 1500
// - usdc primary: -1500
// - usdc secondaryL 1500
// - usdt primary: 3000
// - usdt secondary: 1500
// - 3crv primary: 4000
const E18 = BigNumber.from(10).pow(BigNumber.from(18));
const E6 = BigNumber.from(10).pow(BigNumber.from(6));
const ZERO = BigNumber.from(0);
const HARVEST_THRESHOLD = [
    BigNumber.from(-1500).mul(E18),
    BigNumber.from(1500).mul(E18),
    BigNumber.from(-1500).mul(E6),
    BigNumber.from(1500).mul(E6),
    BigNumber.from(3000).mul(E6),
    BigNumber.from(1500).mul(E6),
    BigNumber.from(4000).mul(E18),
];
interface IInvestTrigger {
    needCall: Boolean;
    params?: any;
}

const NONEED_TRIGGER: IInvestTrigger = { needCall: false };
const GAS_PRICE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(9));
const CURVE_DISTRIBUTE_BUFFER = BigNumber.from(1);

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

async function curveInvestTrigger(vault, lifeguard) {
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

    const investTriggerResult = await lifeguard
        .investToCurveVaultTrigger()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Call investToCurveVaultTrigger of ${vaultName} : ${vault.address} to check if the lifeguard need investment failed`,
                MESSAGE_TYPES.investTrigger
            );
        });

    logger.info(
        `${vaultName} : ${vault.address} invest trigger: ${investTriggerResult}`
    );
    return investTriggerResult;
}

async function sortStrategyByLastHarvested(vaults, providerKey) {
    if (vaults.length === 0) {
        logger.info('Not fund any vault.');
        throw new ContractCallError(
            'Not found any vaults',
            MESSAGE_TYPES.harvestTrigger
        );
    }

    const vaultsStrategyLength = getStrategyLength();
    const strategiesStatus = [];
    const gasPrice = await vaults[0].signer.getGasPrice();
    logger.info(`gasPrice ${gasPrice}`);
    for (let i = 0; i < vaults.length; i += 1) {
        const adapterAddress = vaults[i].address;
        const vaultName = getVaultAndStrategyLabels()[adapterAddress].name;
        const strategyArray =
            getVaultAndStrategyLabels()[adapterAddress].strategies;
        logger.info(`${vaultName}: ${adapterAddress}`);
        const vault = vaults[i];
        const yearnVault = getYearnVaults(providerKey)[i];
        const strategyLength = vaultsStrategyLength[i];
        logger.info(`strategyLength: ${strategyLength}`);
        for (let j = 0; j < strategyLength; j += 1) {
            // Get harvest callCost
            const callCostKey = `harvest_callcost.vault_${i}.strategy_${j}`;
            const baseCallCost = BigNumber.from(getConfig(callCostKey, false));
            const callCost = baseCallCost.mul(gasPrice);
            // eslint-disable-next-line no-await-in-loop
            let triggerResult = await vault.strategyHarvestTrigger(
                j,
                callCost
            );
            logger.info(
                `vault: ${i}, strategy: ${j}, callcost: ${callCost}, triggerResult ${triggerResult}`
            );
            // eslint-disable-next-line no-await-in-loop
            const strategyParam = await yearnVault.strategies(
                strategyArray[j].address
            );
            logger.info(
                `strategyParam ${strategyArray[j].address} ${strategyParam}`
            );
            // eslint-disable-next-line no-await-in-loop
            const strategy = strategyArray[j].strategy;
            const estimatedTotalAssets = await strategy.estimatedTotalAssets();
            const expectedReturn = estimatedTotalAssets.sub(
                strategyParam.totalDebt
            );
            if (process.env.NODE_ENV === 'mainnet' || process.env.NODE_ENV === 'develop') {
                const threshold = HARVEST_THRESHOLD[i * 2 + j];
                triggerResult = threshold.gt(ZERO)
                    ? expectedReturn.gt(threshold)
                    : expectedReturn.lt(threshold);
                logger.info(`harvest threshold ${threshold} triggerResult ${triggerResult}`)

            }
            logger.info(
                `strategy estimated total assets ${estimatedTotalAssets} totalDebt ${strategyParam.totalDebt} expectedReturn ${expectedReturn} `
            );
            strategiesStatus.push({
                vaultIndex: i,
                strategyIndex: j,
                address: strategyArray[j].address,
                trigger: triggerResult,
                lastHarvest: strategyParam.lastReport,
                totalDebt: strategyParam.totalDebt,
                estimatedTotalAssets,
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
    const lastVaultIndex = vaults.length - 1;
    for (let i = 0; i < lastVaultIndex; i += 1) {
        triggerPromises.push(adapterInvestTrigger(vaults[i]));
    }
    triggerPromises.push(
        curveInvestTrigger(
            vaults[lastVaultIndex],
            getLifeguard(providerKey, walletKey)
        )
    );
    const result = await Promise.all(triggerPromises);
    const strategies = await sortStrategyByLastHarvested(vaults, providerKey);
    let needInvestIndex = -1;
    const orderedVaults = [];
    for (let i = 0; i < strategies.length; i += 1) {
        const { vaultIndex, strategyIndex, lastHarvest } = strategies[i];
        logger.info(
            `strategy ${vaultIndex}, ${strategyIndex}, ${lastHarvest}, ${result[vaultIndex]}`
        );
        // TODO: skip xpool check at the beginning
        if (strategies[i].trigger && vaultIndex < 3) {
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
    const strategies = await sortStrategyByLastHarvested(vaults, providerKey);
    const gasPrice = await vaults[0].signer.getGasPrice();
    logger.info(`gasPrice ${gasPrice}`);
    for (let i = 0; i < strategies.length; i += 1) {
        const {
            vaultIndex,
            strategyIndex,
            trigger,
            totalDebt,
            estimatedTotalAssets,
        } = strategies[i];
        logger.info(
            `harvestOneTrigger ${vaultIndex} ${strategyIndex} ${trigger}`
        );
        if (trigger) {
            // Get harvest callCost
            const callCostKey = `harvest_callcost.vault_${vaultIndex}.strategy_${strategyIndex}`;
            const baseCallCost = BigNumber.from(getConfig(callCostKey, false));
            const callCost = baseCallCost.mul(gasPrice);
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
    rebalanceTriggerMessage({ isRebalance: needRebalance });
    return rebalanceTriggerResult;
}

async function distributeCurveVaultTrigger(providerKey, walletKey) {
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

    if (
        pendingTransactions.get('withdrawToAdapter') ||
        pendingTransactions.get('distributeCurveAssets')
    ) {
        const result = `Already has pending curve-exposure transaction: ${
            pendingTransactions.get('withdrawToAdapter').hash ||
            pendingTransactions.get('distributeCurveAssets').hash
        }`;
        logger.info(result);
        throw new PendingTransactionError(
            result,
            MESSAGE_TYPES.distributeCurveVault
        );
    }
    const insurance = getInsurance(providerKey, walletKey);
    const exposure = getExposure(providerKey, walletKey);
    const bouy3pool = getBuoy(providerKey, walletKey);

    const preCal = await insurance.prepareCalculation();
    const riskResult = await exposure.getExactRiskExposure(preCal);
    const curveExposure = riskResult[2];
    const curveTarget = await insurance.curveVaultPercent();

    logger.info(
        `curve exposure: ${curveExposure} curve target: ${curveTarget}`
    );

    let distributeCurveVaultTriggerResult = NONEED_TRIGGER;
    if (curveExposure.gt(curveTarget)) {
        const totalAssetsUsd = preCal[0];
        const curveUsd = preCal[1];
        logger.info(`totalAssetsUsd ${preCal[0]}, curveAssetsUsd ${preCal[1]}`);
        // TODO: add 0.1% as buffer. Will over-withdraw 0.1%
        const expectedCurveUsd = totalAssetsUsd
            .mul(curveTarget.sub(CURVE_DISTRIBUTE_BUFFER))
            .div(10000);
        const usdAmountNeedDistribute = curveUsd.sub(expectedCurveUsd);
        const lpAmountNeedDistribute = await bouy3pool.usdToLp(
            usdAmountNeedDistribute
        );
        logger.info(
            `usdAmountNeedDistribute ${usdAmountNeedDistribute} lpAmountNeedDistribute: ${lpAmountNeedDistribute}`
        );
        const delta = await insurance.calculateDepositDeltasOnAllVaults();
        logger.info(`distribute delta ${delta[0]}, ${delta[1]}, ${delta[2]}`);
        distributeCurveVaultTriggerResult = {
            needCall: true,
            params: {
                amount: lpAmountNeedDistribute,
                delta,
            },
        };
    }
    distributeCurveVaultTriggerMessage(distributeCurveVaultTriggerResult);
    return distributeCurveVaultTriggerResult;
}

export {
    investTrigger,
    harvestOneTrigger,
    rebalanceTrigger,
    distributeCurveVaultTrigger,
};
