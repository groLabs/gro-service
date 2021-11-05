"use strict";
const { getController, getInsurance, getLifeguard, getVaults, getVaultAndStrategyLabels, getCurveVault, getBuoy, } = require('../../contract/allContracts');
const { addPendingTransaction } = require('../../common/storage');
const { ContractSendError, ContractCallError } = require('../../dist/common/error').default;
const { MESSAGE_TYPES } = require('../../dist/common/discord/discordService').default;
const { investMessage } = require('../../discordMessage/investMessage');
const { rebalanceMessage } = require('../../discordMessage/rebalanceMessage');
const { harvestMessage } = require('../../discordMessage/harvestMessage');
const { safetyCheckMessage } = require('../../discordMessage/otherMessage');
const { wrapSendTransaction } = require('../../gasPrice/transaction');
const logger = require('../regularLogger');
async function adapterInvest(blockNumber, isInvested, vault, providerKey, walletKey) {
    // This is to skip curve invest
    if (!isInvested)
        return;
    const vaultName = getVaultAndStrategyLabels()[vault.address].name;
    const investResponse = await wrapSendTransaction(vault, 'invest').catch((error) => {
        logger.error(error);
        throw new ContractSendError(`${vaultName}:${vault.address}'s invest call failed`, MESSAGE_TYPES.invest);
    });
    logger.info(`investResponse: ${JSON.stringify(investResponse)}`);
    addPendingTransaction(`invest-${vault.address}`, {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes: 0,
        methodName: 'invest',
        label: MESSAGE_TYPES.invest,
    }, investResponse);
    investMessage({
        vaultName,
        vaultAddress: vault.address,
        transactionHash: investResponse.hash,
    });
}
async function invest(blockNumber, vaultIndex, providerKey, walletKey) {
    const vaults = getVaults(providerKey, walletKey);
    await adapterInvest(blockNumber, true, vaults[vaultIndex], providerKey, walletKey);
}
async function harvest(blockNumber, strategyInfo, providerKey, walletKey) {
    const key = `harvest-${strategyInfo.vault.address}-${strategyInfo.strategyIndex}`;
    logger.info(`harvest ${key}`);
    const vaultName = getVaultAndStrategyLabels()[strategyInfo.vault.address].name;
    const strategyName = getVaultAndStrategyLabels()[strategyInfo.vault.address].strategies[strategyInfo.strategyIndex].name;
    const harvestResult = await wrapSendTransaction(strategyInfo.vault, 'strategyHarvest', [strategyInfo.strategyIndex]).catch((error) => {
        logger.error(error);
        throw new ContractSendError(`${vaultName}'s ${strategyName} harvest call failed.`, MESSAGE_TYPES.harvest, {
            vault: strategyInfo.vault.address,
            strategyIndex: strategyInfo.strategyIndex,
            callCost: strategyInfo.callCost.toString(),
        });
    });
    addPendingTransaction(key, {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes: 0,
        methodName: 'strategyHarvest',
        label: MESSAGE_TYPES.harvest,
    }, harvestResult);
    harvestMessage({
        vaultName,
        strategyName,
        vaultAddress: strategyInfo.vault.address,
        transactionHash: harvestResult.hash,
        strategyAddress: getVaultAndStrategyLabels()[strategyInfo.vault.address].strategies[strategyInfo.strategyIndex].address,
    });
}
async function rebalance(blockNumber, providerKey, walletKey) {
    const rebalanceReponse = await wrapSendTransaction(getInsurance(providerKey, walletKey), 'rebalance').catch((error) => {
        logger.error(error);
        throw new ContractSendError('Rebalance call failed.', MESSAGE_TYPES.rebalance);
    });
    addPendingTransaction('rebalance', {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes: 0,
        methodName: 'rebalance',
        label: MESSAGE_TYPES.rebalance,
    }, rebalanceReponse);
    rebalanceMessage({ transactionHash: rebalanceReponse.hash });
}
async function curveInvest(blockNumber, providerKey, walletKey) {
    const curveVaultAddress = getCurveVault(providerKey, walletKey).address;
    const vaultName = getVaultAndStrategyLabels()[curveVaultAddress].name;
    const investResponse = await wrapSendTransaction(getLifeguard(providerKey, walletKey), 'investToCurveVault').catch((error) => {
        logger.error(error);
        throw new ContractSendError(`Call ${vaultName}'s investToCurveVault to invest lifeguard assets failed.`, MESSAGE_TYPES.curveInvest);
    });
    addPendingTransaction(`invest-${curveVaultAddress}`, {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes: 0,
        methodName: 'investToCurveVault',
        label: MESSAGE_TYPES.curveInvest,
    }, investResponse);
    investMessage({
        vaultName,
        vaultAddress: curveVaultAddress,
        transactionHash: investResponse.hash,
    });
}
async function execActions(blockNumber, triggerResult) {
    // Handle invest
    if (triggerResult[0].needCall) {
        logger.info('invest');
        await invest(blockNumber, triggerResult[0].params);
    }
    // Handle harvest
    if (triggerResult[1].needCall) {
        logger.info('harvest');
        await harvest(blockNumber, triggerResult[1].params);
    }
    // Handle Rebalance
    if (triggerResult[2].needCall) {
        logger.info('rebalance');
        await rebalance(blockNumber);
    }
    // Handle Curve invest
    if (triggerResult[3].needCall) {
        logger.info('curve invest');
        await curveInvest(blockNumber);
    }
}
async function priceSafetyCheck(providerKey) {
    const isSafety = await getBuoy(providerKey)
        .safetyCheck()
        .catch((error) => {
        logger.error(error);
        throw new ContractCallError('safetyCheck call failed', MESSAGE_TYPES.other);
    });
    logger.info(`Price safe check : ${isSafety}`);
    if (!isSafety) {
        safetyCheckMessage();
    }
}
async function distributeCurveVault(blockNumber, providerKey, walletKey, amount, delta) {
    logger.info(`amount ${amount} delta ${delta[0]} ${delta[1]} ${delta[2]}`);
    const vaults = getVaults(providerKey, walletKey);
    const withdrawResponse = await wrapSendTransaction(vaults[3], 'withdrawToAdapter', [amount, 0]).catch((error) => {
        logger.error(error);
        throw new ContractSendError('withdrawResponse call failed.', MESSAGE_TYPES.distributeCurveVault);
    });
    const distributeCurveVaultResponse = await wrapSendTransaction(getController(providerKey, walletKey), 'distributeCurveAssets', [amount, delta]).catch((error) => {
        logger.error(error);
        throw new ContractSendError('distributeCurveVault call failed.', MESSAGE_TYPES.distributeCurveVault);
    });
    addPendingTransaction('curve-exposure', {
        blockNumber,
        providerKey,
        walletKey,
        reSendTimes: 0,
        methodName: 'distributeCurveVault',
        label: MESSAGE_TYPES.distributeCurveVault,
    }, distributeCurveVaultResponse);
    rebalanceMessage({ transactionHash: distributeCurveVaultResponse.hash });
}
module.exports = {
    invest,
    curveInvest,
    harvest,
    rebalance,
    execActions,
    priceSafetyCheck,
    distributeCurveVault,
};
