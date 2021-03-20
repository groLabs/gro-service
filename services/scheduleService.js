'use strict';

const schedule = require('node-schedule');
const config = require('config');
const { getDefaultProvider, getNonceManager } = require('../common/web3tool');
const { pendingTransactions } = require('../common/storage');
const { sendMessageToOPSChannel } = require('./discordServie');
const logger = require('../common/logger');
const provider = getDefaultProvider();
const nonceManager = getNonceManager();

const triggerBotAccountBalance = function () {
    schedule.scheduleJob('30 * * * * *', async function () {
        const botAccount = config.get('blockchain.bot_address');
        const balance = await nonceManager.getBalance();
        logger.info(`bot: ${botAccount} balance ${balance.toString()}`);
    });
};

const handleLongPendingTransactions = async function () {
    schedule.scheduleJob('50 * * * * *', async function () {
        logger.info(
            `schedulePendingTransactionsCheck running at ${Date.now()}`
        );
        const transactionTypes = pendingTransactions.keys();
        if (transactionTypes == 0) return;

        Array.from(transactionTypes).forEach(async (type) => {
            const oldTransaction = pendingTransactions.get(type);
            const hash = oldTransaction.hash;
            const transactionReceipt = await provider
                .getTransactionReceipt(hash)
                .catch((err) => {
                    logger.error(err);
                    sendMessageToOPSChannel(
                        `${type} ${hash} getTransactionReceipt error.`
                    );
                    return null;
                });
            const timestamps = Date.now() - oldTransaction.createdTime;
            if (!transactionReceipt || timestamps > 6000) {
                // transactionReceipt == null, pending > 6s, resend
                const signedTX = await nonceManager.signTransaction(
                    oldTransaction.transactionRequest
                );
                const transactionResponse = await nonceManager.sendTransaction(
                    signedTX
                );
                pendingTransactions.set(type, {
                    blockNumber: oldTransaction.blockNumber,
                    reSendTimes: oldTransaction.reSendTimes + 1,
                    hash: transactionResponse.hash,
                    createdTime: Date.now(),
                    transactionRequest: {
                        nonce: transactionResponse.nonce,
                        gasPrice: transactionResponse.gasPrice.hex,
                        gasLimit: transactionResponse.gasPrice.hex,
                        to: transactionResponse.to,
                        value: transactionResponse.value.hex,
                        data: transactionResponse.data,
                        chainId: transactionResponse.chainId,
                        from: transactionResponse.from,
                    },
                });
                pendingTransactions.delete(type);
                return;
            }

            // remove hash from pending transactions
            pendingTransactions.delete(type);

            if (transactionReceipt.status == 1) {
                sendMessageToOPSChannel(`${type} ${hash} successfully.`);
                logger.info(`${type} ${hash} mined.`);
            } else {
                sendMessageToOPSChannel(`${type} ${hash} reverted.`);
                logger.info(`${type} ${hash} reverted.`);
            }
        });
    });
};

// triggerBotAccountBalance();
// handleLongPendingTransactions()
