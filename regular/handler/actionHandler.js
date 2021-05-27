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
const { pendingTransactions } = require('../../common/storage');
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
const logger = require('../regularLogger');

async function adapterInvest(blockNumber, isInvested, vault) {
    // This is to skip curve invest
    if (!isInvested) return;
    const vaultName = getVaultAndStrategyLabels()[vault.address].name;
    const investResponse = await vault.invest().catch((error) => {
        logger.error(error);
        throw new ContractSendError(
            `${vaultName}:${vault.address}'s invest call failed`,
            MESSAGE_TYPES.invest
        );
    });
    pendingTransactions.set(`invest-${vault.address}`, {
        blockNumber,
        reSendTimes: 0,
        hash: investResponse.hash,
        label: MESSAGE_TYPES.invest,
        createdTime: new Date(),
        transactionRequest: {
            nonce: investResponse.nonce,
            gasPrice: investResponse.gasPrice.hex,
            gasLimit: investResponse.gasLimit.hex,
            to: investResponse.to,
            value: investResponse.value.hex,
            data: investResponse.data,
            chainId: investResponse.chainId,
            from: investResponse.from,
        },
    });
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
    const harvestResult = await strategyInfo.vault
        .strategyHarvest(strategyInfo.strategyIndex, strategyInfo.callCost)
        .catch((error) => {
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

    pendingTransactions.set(key, {
        blockNumber,
        reSendTimes: 0,
        hash: harvestResult.hash,
        createdTime: new Date(),
        label: MESSAGE_TYPES.harvest,
        transactionRequest: {
            nonce: harvestResult.nonce,
            gasPrice: harvestResult.gasPrice.hex,
            gasLimit: harvestResult.gasLimit.hex,
            to: harvestResult.to,
            value: harvestResult.value.hex,
            data: harvestResult.data,
            chainId: harvestResult.chainId,
            from: harvestResult.from,
        },
    });
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
    const pnlResponse = await pnl.execPnL(0).catch((error) => {
        logger.error(error);
        throw new ContractSendError('ExecPnL call failed.', MESSAGE_TYPES.pnl);
    });

    pendingTransactions.set('pnl', {
        blockNumber,
        reSendTimes: 0,
        hash: pnlResponse.hash,
        createdTime: new Date(),
        label: MESSAGE_TYPES.pnl,
        transactionRequest: {
            nonce: pnlResponse.nonce,
            gasPrice: pnlResponse.gasPrice.hex,
            gasLimit: pnlResponse.gasLimit.hex,
            to: pnlResponse.to,
            value: pnlResponse.value.hex,
            data: pnlResponse.data,
            chainId: pnlResponse.chainId,
            from: pnlResponse.from,
        },
    });
    pnlMessage({ transactionHash: pnlResponse.hash });
}

async function rebalance(blockNumber) {
    const rebalanceReponse = await getInsurance()
        .rebalance()
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                'Rebalance call failed.',
                MESSAGE_TYPES.rebalance
            );
        });

    pendingTransactions.set('rebalance', {
        blockNumber,
        reSendTimes: 0,
        hash: rebalanceReponse.hash,
        createdTime: new Date(),
        label: MESSAGE_TYPES.rebalance,
        transactionRequest: {
            nonce: rebalanceReponse.nonce,
            gasPrice: rebalanceReponse.gasPrice.hex,
            gasLimit: rebalanceReponse.gasLimit.hex,
            to: rebalanceReponse.to,
            value: rebalanceReponse.value.hex,
            data: rebalanceReponse.data,
            chainId: rebalanceReponse.chainId,
            from: rebalanceReponse.from,
        },
    });
    rebalanceMessage({ transactionHash: rebalanceReponse.hash });
}

async function curveInvest(blockNumber) {
    const curveVaultAddress = getCurveVault().address;
    const vaultName = getVaultAndStrategyLabels()[curveVaultAddress].name;
    const investResponse = await getLifeguard()
        .investToCurveVault()
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                `Call ${vaultName}'s investToCurveVault to invest lifeguard assets failed.`,
                MESSAGE_TYPES.curveInvest
            );
        });

    pendingTransactions.set(`invest-${curveVaultAddress}`, {
        blockNumber,
        reSendTimes: 0,
        hash: investResponse.hash,
        createdTime: new Date(),
        label: MESSAGE_TYPES.curveInvest,
        transactionRequest: {
            nonce: investResponse.nonce,
            gasPrice: investResponse.gasPrice.hex,
            gasLimit: investResponse.gasLimit.hex,
            to: investResponse.to,
            value: investResponse.value.hex,
            data: investResponse.data,
            chainId: investResponse.chainId,
            from: investResponse.from,
        },
    });
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
