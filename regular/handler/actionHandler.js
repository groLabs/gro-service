const {
    getInsurance,
    getPnl,
    getLifeguard,
    getVaults,
} = require('../../contract/allContracts');
const { pendingTransactions } = require('../../common/storage');
const { ContractSendError } = require('../../common/error');
const {
    MESSAGE_TYPES,
    sendMessageToProtocolEventChannel,
} = require('../../common/discord/discordService');
const logger = require('../regularLogger');

async function adapterInvest(blockNumber, isInvested, vault) {
    if (!isInvested) return;

    const investResponse = await vault.invest().catch((error) => {
        logger.error(error);
        throw new ContractSendError(
            `Call adapter:${vault.address}'s invest function to invest asset failed.`,
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
    sendMessageToProtocolEventChannel({
        message: `Call adapter:${vault.address}'s invest function to invest assets.`,
        type: MESSAGE_TYPES.invest,
        transactionHash: investResponse.hash,
    });
}

async function invest(blockNumber, investParams) {
    const vaults = getVaults();
    const investPromises = [];
    for (let i = 0; i < vaults.length; i += 1) {
        investPromises.push(
            adapterInvest(blockNumber, investParams[i], vaults[i])
        );
    }
    await Promise.all(investPromises);
}

async function harvestStrategy(blockNumber, strategyInfo) {
    const key = `harvest-${strategyInfo.vault.address}-${strategyInfo.strategyIndex}`;
    const harvestResult = await strategyInfo.vault
        .strategyHarvest(strategyInfo.strategyIndex, strategyInfo.callCost)
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                `Call strategyHarvest function to harvest vault:${strategyInfo.vault.address}'s index:${strategyInfo.strategyIndex} strategy failed.`,
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

    sendMessageToProtocolEventChannel({
        message: `Call strategyHarvest function to harvest vault:${strategyInfo.vault.address}'s index:${strategyInfo.strategyIndex} strategy`,
        type: MESSAGE_TYPES.harvest,
        params: {
            vault: strategyInfo.vault.address,
            strategyIndex: strategyInfo.strategyIndex,
            callCost: strategyInfo.callCost.toString(),
        },
        transactionHash: harvestResult.hash,
    });
}

async function harvest(blockNumber, harvestStrategies) {
    const harvestPromises = [];
    for (let i = 0; i < harvestStrategies.length; i += 1) {
        const strategyInfo = harvestStrategies[i];
        harvestPromises.push(harvestStrategy(blockNumber, strategyInfo));
    }
    await Promise.all(harvestPromises).catch((error) => {
        throw error;
    });
}

async function execPnl(blockNumber) {
    const pnl = getPnl();
    const pnlResponse = await pnl.execPnL(0).catch((error) => {
        logger.error(error);
        throw new ContractSendError(
            'Call execPnL function to execuate PnL failed.',
            MESSAGE_TYPES.pnl
        );
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
    sendMessageToProtocolEventChannel({
        message: 'Call execPnL function to execuate PnL',
        type: MESSAGE_TYPES.pnl,
        transactionHash: pnlResponse.hash,
    });
}

async function rebalance(blockNumber) {
    const rebalanceReponse = await getInsurance()
        .rebalance()
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                'Call rebalance function to adjust system assets failed.',
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

    const msgObj = {
        message: 'Call rebalance function to adjust system assets',
        type: MESSAGE_TYPES.rebalance,
        transactionHash: rebalanceReponse.hash,
    };
    sendMessageToProtocolEventChannel(msgObj);
}

async function curveInvest(blockNumber) {
    const investResponse = await getLifeguard()
        .investToCurveVault()
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                'Call investToCurveVault to invest lifeguard assets failed.',
                MESSAGE_TYPES.curveInvest
            );
        });

    pendingTransactions.set('curveInvest', {
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

    const msgObj = {
        message: 'Call investToCurveVault function to invest lifeguard assets',
        type: MESSAGE_TYPES.curveInvest,
        transactionHash: investResponse.hash,
    };
    sendMessageToProtocolEventChannel(msgObj);
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
