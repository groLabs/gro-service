'use strict';

const logger = require('../common/logger');
const { getDefaultProvider, getNonceManager } = require('../common/chainUtil');
const { pendingTransactions } = require('../common/storage');
const { execActions } = require('../handler/actionHandler');
const { callTriggers } = require('../handler/triggerHandler');
const nonceManager = getNonceManager();

class BlockWorker {
    blockQueues = [];

    constructor() {
        this.currenctHandlePromise = undefined;
        logger.info('HandleBlockService initialize done.');
    }

    handleNewBlock(blockNumber) {
        this.blockQueues.push(blockNumber);
        this.#startHandleBlock();
    }

    startHandleBlock() {
        if (this.currenctHandlePromise) return;
        const blockNumber = this.#blockQueues.shift();
        if (!blockNumber) return;

        // handle triggers
        const startTime = Date.now();
        this.currenctHandlePromise = this.handleBlock(blockNumber);

        this.currenctHandlePromise.then(() => {
            const endTime = Date.now();
            this.currenctHandlePromise = undefined;
            if (this.#blockQueues.length) {
                logger.info('Process time: ' + (endTime - startTime));
                this.#startHandleBlock();
            }
        });
    }

    async checkPendingTransactions() {
        const transactionTypes = pendingTransactions.keys();
        if (transactionTypes == 0) return;

        Array.from(transactionTypes).forEach(async (type) => {
            const transactionInfo = pendingTransactions.get(type);
            const hash = transactionInfo.hash;
            const transactionReceipt = await getDefaultProvider()
                .getTransactionReceipt(hash)
                .catch((err) => {
                    logger.error(err);
                    return null;
                });
            if (!transactionReceipt) return;

            // remove type from pending transactions
            pendingTransactions.delete(type);

            if (transactionReceipt.status == 1) {
                logger.info(`${type} ${hash} mined.`);
            } else {
                logger.info(`${type} ${hash} reverted.`);
            }
        });
    }

    getPendingBlocks() {
        return Array.from(this.#blockQueues);
    }

    async syncNounce() {
        // Get nonce from chain
        const transactionCountInChain = await nonceManager
            .getTransactionCount()
            .catch((error) => {
                logger.error(error);
                return -1;
            });
        if (transactionCountInChain == -1) {
            logger.error('Get transactionCountInChain failed.');
            return;
        }
        // Get local nonce
        const transactionCountInLocal = await nonceManager
            .getTransactionCount('pending')
            .catch((error) => {
                logger.error(error);
                return -1;
            });
        if (transactionCountInLocal == -1) {
            logger.error('Get transactionCountInLocal failed.');
            return;
        }
        // Adjust local nonce
        if (transactionCountInChain > transactionCountInLocal) {
            nonceManager.setTransactionCount(transactionCountInChain);
            logger.info(`Adjust local nonce to ${transactionCountInChain}.`);
        }
    }

    async handleBlock(blockNumber) {
        logger.info('Block Number: ' + blockNumber);
        await this.syncNounce();
        // Check Pending transactions
        await this.checkPendingTransactions();
        // Call trigger
        const triggerResult = await callTriggers();
        if (triggerResult.length == 0) return;
        // Call transaction
        await execActions(blockNumber, triggerResult);
    }
}

module.exports = BlockWorker;
