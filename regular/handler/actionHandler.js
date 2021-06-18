const {
    getInsurance,
    getPnl,
    getLifeguard,
    getVaults,
    getVaultAndStrategyLabels,
    getCurveVault,
} = require('../../contract/allContracts');
const { addPendingTransaction } = require('../../common/storage');
const { ContractSendError } = require('../../common/error');
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { investMessage } = require('../../discordMessage/investMessage');
const { rebalanceMessage } = require('../../discordMessage/rebalanceMessage');
const { pnlMessage } = require('../../discordMessage/pnlMessage');
const { harvestMessage } = require('../../discordMessage/harvestMessage');
const { wrapSendTransaction } = require('../../gasPrice/transaction');
const logger = require('../regularLogger');

async function adapterInvest(
    blockNumber,
    isInvested,
    vault,
    providerKey,
    walletKey
) {
    // This is to skip curve invest
    if (!isInvested) return;
    const vaultName = getVaultAndStrategyLabels()[vault.address].name;
    const investResponse = await wrapSendTransaction(vault, 'invest').catch(
        (error) => {
            logger.error(error);
            throw new ContractSendError(
                `${vaultName}:${vault.address}'s invest call failed`,
                MESSAGE_TYPES.invest
            );
        }
    );
    logger.info(`investResponse: ${JSON.stringify(investResponse)}`);

    addPendingTransaction(
        `invest-${vault.address}`,
        {
            blockNumber,
            providerKey,
            walletKey,
            reSendTimes: 0,
            methodName: 'invest',
            label: MESSAGE_TYPES.invest,
        },
        investResponse
    );

    investMessage({
        vaultName,
        vaultAddress: vault.address,
        transactionHash: investResponse.hash,
    });
}

async function invest(blockNumber, vaultIndex, providerKey, walletKey) {
    const vaults = getVaults(providerKey, walletKey);
    await adapterInvest(
        blockNumber,
        true,
        vaults[vaultIndex],
        providerKey,
        walletKey
    );
}

async function harvest(blockNumber, strategyInfo, providerKey, walletKey) {
    const key = `harvest-${strategyInfo.vault.address}-${strategyInfo.strategyIndex}`;
    logger.info(`harvest ${key}`);
    const vaultName =
        getVaultAndStrategyLabels()[strategyInfo.vault.address].name;
    const strategyName =
        getVaultAndStrategyLabels()[strategyInfo.vault.address].strategies[
            strategyInfo.strategyIndex
        ].name;
    const harvestResult = await wrapSendTransaction(
        strategyInfo.vault,
        'strategyHarvest',
        [strategyInfo.strategyIndex, strategyInfo.callCost]
    ).catch((error) => {
        logger.error(error);
        throw new ContractSendError(
            `${vaultName}'s ${strategyName} harvest call failed.`,
            MESSAGE_TYPES.harvest,
            {
                vault: strategyInfo.vault.address,
                strategyIndex: strategyInfo.strategyIndex,
                callCost: strategyInfo.callCost.toString(),
            }
        );
    });

    addPendingTransaction(
        key,
        {
            blockNumber,
            providerKey,
            walletKey,
            reSendTimes: 0,
            methodName: 'strategyHarvest',
            label: MESSAGE_TYPES.harvest,
        },
        harvestResult
    );

    harvestMessage({
        vaultName,
        strategyName,
        vaultAddress: strategyInfo.vault.address,
        transactionHash: harvestResult.hash,
        strategyAddress:
            getVaultAndStrategyLabels()[strategyInfo.vault.address].strategies[
                strategyInfo.strategyIndex
            ].address,
    });
}

async function execPnl(blockNumber, providerKey, walletKey) {
    const pnl = getPnl(providerKey, walletKey);
    const pnlResponse = await wrapSendTransaction(pnl, 'execPnL', [0]).catch(
        (error) => {
            logger.error(error);
            throw new ContractSendError(
                'ExecPnL call failed.',
                MESSAGE_TYPES.pnl
            );
        }
    );

    addPendingTransaction(
        'pnl',
        {
            blockNumber,
            providerKey,
            walletKey,
            reSendTimes: 0,
            methodName: 'execPnL',
            label: MESSAGE_TYPES.pnl,
        },
        pnlResponse
    );
    pnlMessage({ transactionHash: pnlResponse.hash });
}

async function rebalance(blockNumber, providerKey, walletKey) {
    const rebalanceReponse = await wrapSendTransaction(
        getInsurance(providerKey, walletKey),
        'rebalance'
    ).catch((error) => {
        logger.error(error);
        throw new ContractSendError(
            'Rebalance call failed.',
            MESSAGE_TYPES.rebalance
        );
    });

    addPendingTransaction(
        'rebalance',
        {
            blockNumber,
            providerKey,
            walletKey,
            reSendTimes: 0,
            methodName: 'rebalance',
            label: MESSAGE_TYPES.rebalance,
        },
        rebalanceReponse
    );

    rebalanceMessage({ transactionHash: rebalanceReponse.hash });
}

async function curveInvest(blockNumber, providerKey, walletKey) {
    const curveVaultAddress = getCurveVault(providerKey, walletKey).address;
    const vaultName = getVaultAndStrategyLabels()[curveVaultAddress].name;
    const investResponse = await wrapSendTransaction(
        getLifeguard(providerKey, walletKey),
        'investToCurveVault'
    ).catch((error) => {
        logger.error(error);
        throw new ContractSendError(
            `Call ${vaultName}'s investToCurveVault to invest lifeguard assets failed.`,
            MESSAGE_TYPES.curveInvest
        );
    });

    addPendingTransaction(
        `invest-${curveVaultAddress}`,
        {
            blockNumber,
            providerKey,
            walletKey,
            reSendTimes: 0,
            methodName: 'investToCurveVault',
            label: MESSAGE_TYPES.curveInvest,
        },
        investResponse
    );

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

    // Handle Pnl
    if (triggerResult[2].needCall) {
        logger.info('pnl');
        await execPnl(blockNumber);
    }

    // Handle Rebalance
    if (triggerResult[3].needCall) {
        logger.info('rebalance');
        await rebalance(blockNumber);
    }

    // Handle Curve invest
    if (triggerResult[4].needCall) {
        logger.info('curve invest');
        await curveInvest(blockNumber);
    }
}

module.exports = {
    invest,
    curveInvest,
    harvest,
    execPnl,
    rebalance,
    execActions,
};
