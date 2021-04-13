'use strict';

const schedule = require('node-schedule');
const { BigNumber } = require('ethers');
const {
    getDefaultProvider,
    getNonceManager,
    syncNounce,
    checkPendingTransactions,
} = require('../../common/chainUtil');
const { pendingTransactions } = require('../../common/storage');
const { ETH_DECIMAL, div } = require('../../common/digitalUtil');
const {
    sendMessageToLogChannel,
    sendMessageToAlertChannel,
    sendMessageToProtocolEventChannel,
} = require('../../common/discord/discordService');
const {
    SettingError,
    BlockChainCallError,
    ContractCallError,
} = require('../../common/customErrors');
const {
    investTrigger,
    pnlTrigger,
    rebalanceTrigger,
    harvestOneTrigger,
} = require('../handler/triggerHandler');
const {
    invest,
    execPnl,
    rebalance,
    harvest,
} = require('../handler/actionHandler');

const { getVaults, getStrategyLength } = require('../../contract/allContracts');
const {
    getLastBlockNumber,
    updateLastBlockNumber,
    generateDepositReport,
    generateWithdrawReport,
    generateGvtTransfer,
    generatePwrdTransfer,
} = require('../handler/eventHandler');
const logger = require('../regularLogger');
const config = require('config');
const provider = getDefaultProvider();
const nonceManager = getNonceManager();
let pendingTransactionSchedulerSetting = '30 * * * *';
let botBalanceSchedulerSetting = '20 * * * *';
let investTriggerSchedulerSetting = '0 * * * *';
let harvestTriggerSchedulerSetting = '15 * * * *';
let pnlTriggerSchedulerSetting = '30 * * * *';
let rebalanceTriggerSchedulerSetting = '45 * * * *';
let depositWithdrawEventSchedulerSetting = '*/5 * * * *';
let botBalanceWarnVault = '2000000000000000000';

if (!process.env.BOT_ADDRESS) {
    const err = new SettingError(
        'Environment variable BOT_ADDRESS are not set.'
    );
    logger.error(err);
    throw err;
}

const botAccount = process.env.BOT_ADDRESS;

if (config.has('trigger_scheduler.invest')) {
    investTriggerSchedulerSetting = config.get('trigger_scheduler.invest');
}

if (config.has('trigger_scheduler.harvest')) {
    harvestTriggerSchedulerSetting = config.get('trigger_scheduler.harvest');
}

if (config.has('trigger_scheduler.pnl')) {
    pnlTriggerSchedulerSetting = config.get('trigger_scheduler.pnl');
}

if (config.has('trigger_scheduler.rebalance')) {
    rebalanceTriggerSchedulerSetting = config.get(
        'trigger_scheduler.rebalance'
    );
}

if (config.has('trigger_scheduler.pending_transaction_check')) {
    pendingTransactionSchedulerSetting = config.get(
        'trigger_scheduler.pending_transaction_check'
    );
}

if (config.has('trigger_scheduler.bot_balance_check')) {
    botBalanceSchedulerSetting = config.get(
        'trigger_scheduler.bot_balance_check'
    );
}

if (config.has('trigger_scheduler.deposit_withdraw_event')) {
    depositWithdrawEventSchedulerSetting = config.get(
        'trigger_scheduler.deposit_withdraw_event'
    );
}

if (config.has('bot_balance_warn')) {
    botBalanceWarnVault = config.get('bot_balance_warn');
}

const getCurrentBlockNumber = async function () {
    const block = await provider.getBlockNumber().catch((error) => {
        logger.error(error);
        throw new BlockChainCallError(
            'Get current block number from chain failed.'
        );
    });
    return block;
};

const checkBotAccountBalance = function () {
    schedule.scheduleJob(botBalanceSchedulerSetting, async function () {
        const botAccount = process.env.BOT_ADDRESS;
        try {
            const balance = await nonceManager.getBalance();
            if (balance.lt(BigNumber.from(botBalanceWarnVault))) {
                sendMessageToLogChannel({
                    icon: ':warning:',
                    message: `Bot:${botAccount}'s balance is ${div(
                        balance,
                        ETH_DECIMAL,
                        4
                    )}, need full up some balance.`,
                    params: botAccount,
                });
            }
        } catch (error) {
            logger.error(error);
            sendMessageToLogChannel({
                message: `Get eth balance of bot:${botAccount} failed.`,
                params: botAccount,
            });
            sendMessageToAlertChannel(
                new ContractCallError(
                    `Get eth balance of bot:${botAccount} failed.`
                )
            );
        }
    });
};

const checkLongPendingTransactions = async function () {
    if (!pendingTransactions.size) return;

    for (let type of pendingTransactions.keys()) {
        const oldTransaction = pendingTransactions.get(type);
        const hash = oldTransaction.hash;
        const msgLabel = oldTransaction.label;
        const transactionReceipt = await provider
            .getTransactionReceipt(hash)
            .catch((err) => {
                logger.error(err);
                throw new BlockChainCallError(
                    `Get receipt of ${hash} from chain failed.`,
                    msgLabel,
                    hash
                );
            });
        const timestamps = Date.now() - oldTransaction.createdTime;
        if (!transactionReceipt && timestamps > 3600000) {
            // transactionReceipt == null, pending > 6s, resend
            const signedTX = await nonceManager.signTransaction(
                oldTransaction.transactionRequest
            );
            const transactionResponse = await nonceManager
                .sendTransaction(signedTX)
                .catch((error) => {
                    logger.error(error);
                    throw new BlockChainCallError(
                        `Resend transaction: ${hash} failed.`,
                        msgLabel,
                        hash
                    );
                });
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
            return;
        }
        const msgObj = {
            type: 'Bot Pending Transactions',
            params: botAccount,
        };

        if (!transactionReceipt) {
            msgObj.message = `${type} transaction: ${hash} is still pending.`;
            logger.info(msgObj.message);
            sendMessageToProtocolEventChannel(msgObj);
            continue;
        }

        // remove hash from pending transactions
        pendingTransactions.delete(type);

        if (transactionReceipt.status == 1) {
            msgObj.message = `${type} transaction: ${hash} has mined to chain.`;
        } else {
            msgObj.message = `${type} transaction: ${hash} has reverted.`;
        }
        logger.info(msgObj.message);
        sendMessageToProtocolEventChannel(msgObj);
    }
};
const longPendingTransactionsScheduler = function () {
    schedule.scheduleJob(pendingTransactionSchedulerSetting, async function () {
        logger.info(
            `schedulePendingTransactionsCheck running at ${Date.now()}`
        );
        try {
            await checkLongPendingTransactions();
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const investTriggerScheduler = function () {
    schedule.scheduleJob(investTriggerSchedulerSetting, async function () {
        try {
            const vaults = getVaults();
            const keys = [];
            vaults.forEach((vault) => {
                keys.push(`invest-${vault.address}`);
            });

            await checkPendingTransactions(keys);

            const triggerResult = await investTrigger();

            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;

            await syncNounce();
            await invest(currectBlockNumber, triggerResult.params);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const pnlTriggerScheduler = function () {
    schedule.scheduleJob(pnlTriggerSchedulerSetting, async function () {
        try {
            await checkPendingTransactions(['pnl']);

            const triggerResult = await pnlTrigger();

            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;

            await syncNounce();
            await execPnl(currectBlockNumber);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const rebalanceTriggerScheduler = function () {
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async function () {
        try {
            await checkPendingTransactions(['rebalance']);

            const triggerResult = await rebalanceTrigger();

            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;

            await syncNounce();
            await rebalance(currectBlockNumber);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const harvestTriggerScheduler = function () {
    schedule.scheduleJob(harvestTriggerSchedulerSetting, async function () {
        try {
            const vaults = getVaults();
            const vaultsStrategyLength = getStrategyLength();
            const keys = [];
            for (let i = 0; i < vaults.length; i++) {
                const strategyLength = vaultsStrategyLength[i];
                for (let j = 0; j < strategyLength; j++) {
                    keys.push(`harvest-${vaults[i].address}-${j}`);
                }
            }
            await checkPendingTransactions(keys);

            const triggerResult = await harvestOneTrigger();

            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;

            await syncNounce();
            await harvest(currectBlockNumber, triggerResult.params);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const depositWithdrawEventScheduler = function () {
    schedule.scheduleJob(
        depositWithdrawEventSchedulerSetting,
        async function () {
            try {
                const lastBlockNumber = getLastBlockNumber();
                const currectBlockNumber = await getCurrentBlockNumber();
                if (!currectBlockNumber) return;
                await Promise.all([
                    generateDepositReport(lastBlockNumber, currectBlockNumber),
                    generateWithdrawReport(lastBlockNumber, currectBlockNumber),
                    generateGvtTransfer(lastBlockNumber, currectBlockNumber),
                    generatePwrdTransfer(lastBlockNumber, currectBlockNumber),
                ]);
                updateLastBlockNumber(currectBlockNumber);
            } catch (error) {
                sendMessageToAlertChannel(error);
            }
        }
    );
};

const startRegularJobs = function () {
    checkBotAccountBalance();
    investTriggerScheduler();
    harvestTriggerScheduler();
    pnlTriggerScheduler();
    rebalanceTriggerScheduler();
    longPendingTransactionsScheduler();
    depositWithdrawEventScheduler();
};

module.exports = {
    startRegularJobs,
};
