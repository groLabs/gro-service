const {
    getController,
    getInsurance,
    getPnl,
    getLifeguard,
    getVaults,
    getVaultAndStrategyLabels,
    getCurveVault,
    getChainPrice,
} = require('../../contract/allContracts');
const { addPendingTransaction } = require('../../common/storage');
const { ContractSendError } = require('../../common/error');
const {
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
    sendMessage,
} = require('../../common/discord/discordService');
const { investMessage } = require('../../discordMessage/investMessage');
const { rebalanceMessage } = require('../../discordMessage/rebalanceMessage');
const { pnlMessage } = require('../../discordMessage/pnlMessage');
const { harvestMessage } = require('../../discordMessage/harvestMessage');
const {
    updateChainlinkPriceMessage,
} = require('../../discordMessage/otherMessage');
const { wrapSendTransaction } = require('../../gasPrice/transaction');
const logger = require('../regularLogger');

async function adapterInvest(blockNumber, isInvested, vault) {
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

async function invest(blockNumber, investParams) {
    const vaults = getVaults();
    for (let i = 0; i < vaults.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await adapterInvest(blockNumber, investParams[i], vaults[i]);
    }
}

async function harvestStrategy(blockNumber, strategyInfo) {
    const key = `harvest-${strategyInfo.vault.address}-${strategyInfo.strategyIndex}`;
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

async function harvest(blockNumber, harvestStrategies) {
    for (let i = 0; i < harvestStrategies.length; i += 1) {
        const strategyInfo = harvestStrategies[i];
        // eslint-disable-next-line no-await-in-loop
        await harvestStrategy(blockNumber, strategyInfo);
    }
}

async function execPnl(blockNumber) {
    const pnl = getPnl();
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
            reSendTimes: 0,
            methodName: 'execPnL',
            label: MESSAGE_TYPES.pnl,
        },
        pnlResponse
    );
    pnlMessage({ transactionHash: pnlResponse.hash });
}

async function rebalance(blockNumber) {
    const rebalanceReponse = await wrapSendTransaction(
        getInsurance(),
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
            reSendTimes: 0,
            methodName: 'rebalance',
            label: MESSAGE_TYPES.rebalance,
        },
        rebalanceReponse
    );

    rebalanceMessage({ transactionHash: rebalanceReponse.hash });
}

async function curveInvest(blockNumber) {
    const curveVaultAddress = getCurveVault().address;
    const vaultName = getVaultAndStrategyLabels()[curveVaultAddress].name;
    const investResponse = await wrapSendTransaction(
        getLifeguard(),
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

async function updateChainlinkPrice() {
    const stableCoins = await getController()
        .stablecoins()
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                'Get stable coins failed.',
                MESSAGE_TYPES.chainPrice
            );
        });
    const prices = [];
    for (let i = 0; i < stableCoins.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const needUpdate = await getChainPrice().priceUpdateTrigger(
            stableCoins[i]
        );
        logger.info(`needUpdate ${needUpdate}, ${stableCoins[i]}`);
        if (needUpdate) {
            // eslint-disable-next-line no-await-in-loop
            prices[i] = await getChainPrice()
                .getSafePriceFeed(stableCoins[i])
                .catch((error) => {
                    logger.error(error);
                    throw new ContractSendError(
                        `GetSafePriceFeed call for stablecoin: ${stableCoins[i]} failed`,
                        MESSAGE_TYPES.chainPrice
                    );
                });
            updateChainlinkPriceMessage({
                stableCoinAddress: stableCoins[i],
                stableCoinIndex: i,
            });
            logger.info(`getSafePriceFeed ${i}, ${stableCoins[i]}}`);
        } else {
            sendMessage(DISCORD_CHANNELS.botLogs, {
                message: `Call priceUpdateTrigger ${needUpdate}, ${stableCoins[i]}`,
            });
        }
    }
    return prices;
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
    updateChainlinkPrice,
};
