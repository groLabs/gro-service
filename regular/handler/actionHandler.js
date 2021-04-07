'use strict';

const { getInsurance, getPnl } = require('../../contract/allContracts');
const { pendingTransactions } = require('../../common/storage');
const { ContractSendError } = require('../../common/customErrors');
const {
    MESSAGE_TYPES,
    sendMessageToProtocolEventChannel,
} = require('../../common/discord/discordService');
const logger = require('../regularLogger');

const invest = async function (blockNumber, investParams) {
    const investResponse = await getInsurance()
        .invest(investParams)
        .catch((error) => {
            logger.error(error);
            throw new ContractSendError(
                'Call invest function to invest asset failed.',
                MESSAGE_TYPES.invest,
                investParams
            );
        });

    pendingTransactions.set('invest', {
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
        message: `Call invest function with parameter ${investParams} to invest system assets.`,
        type: MESSAGE_TYPES.invest,
        params: investParams,
        transactionHash: investResponse.hash,
    });
};

const harvest = async function (blockNumber, harvestStrategies) {
    for (let i = 0; i < harvestStrategies.length; i++) {
        const strategyInfo = harvestStrategies[i];
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
};

const execPnl = async function (blockNumber) {
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
};

const rebalance = async function (blockNumber, rebalanceParams) {
    let rebalanceReponse;
    let transactionKey;
    if (rebalanceParams[0]) {
        rebalanceReponse = await getInsurance()
            .rebalance()
            .catch((error) => {
                logger.error(error);
                throw new ContractSendError(
                    'Call rebalance function to adjust system assets failed.',
                    MESSAGE_TYPES.rebalance
                );
            });
        transactionKey = 'rebalance';
    } else if (rebalanceParams[1]) {
        rebalanceReponse = await getInsurance()
            .topup()
            .catch((error) => {
                logger.error(error);
                throw new ContractSendError(
                    'Call topup function to full up lifeguard failed.',
                    MESSAGE_TYPES.rebalance
                );
            });
        transactionKey = 'topup';
    }

    pendingTransactions.set(transactionKey, {
        blockNumber,
        reSendTimes: 0,
        hash: rebalanceReponse.hash,
        createdTime: new Date(),
        label: MESSAGE_TYPES[transactionKey],
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
        type: MESSAGE_TYPES[transactionKey],
        transactionHash: rebalanceReponse.hash,
    };
    if (transactionKey == 'topup') {
        msgObj.message = 'Call topup function to full up lifeguard';
    }
    sendMessageToProtocolEventChannel(msgObj);
};

const execActions = async function (blockNumber, triggerResult) {
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

    if (triggerResult[3].needCall) {
        logger.info('rebalance');
        await rebalance(blockNumber, triggerResult[3].params);
    }
};

module.exports = {
    invest,
    harvest,
    execPnl,
    rebalance,
    execActions,
};
