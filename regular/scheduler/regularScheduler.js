const schedule = require('node-schedule');
const {
    syncNounce,
    checkAccountBalance,
    getCurrentBlockNumber,
} = require('../../common/chainUtil');
const { checkPendingTransactions } = require('../../common/pendingTransaction');
const { pendingTransactions } = require('../../common/storage');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const { pendingTransactionResend } = require('../../gasPrice/transaction');
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
    curveInvest,
    updateChainlinkPrice,
} = require('../handler/actionHandler');

const { getVaults, getStrategyLength } = require('../../contract/allContracts');
const { getConfig } = require('../../common/configUtil');
const {
    investTransactionMessage,
} = require('../../discordMessage/investMessage');
const { pnlTransactionMessage } = require('../../discordMessage/pnlMessage');
const {
    rebalanceTransactionMessage,
} = require('../../discordMessage/rebalanceMessage');
const {
    harvestTransactionMessage,
} = require('../../discordMessage/harvestMessage');
const logger = require('../regularLogger');

const pendingTransactionSchedulerSetting =
    getConfig('trigger_scheduler.pending_transaction_check', false) ||
    '30 * * * *';
const botBalanceSchedulerSetting =
    getConfig('trigger_scheduler.bot_balance_check', false) || '20 * * * *';
const investTriggerSchedulerSetting =
    getConfig('trigger_scheduler.invest', false) || '0 * * * *';
const harvestTriggerSchedulerSetting =
    getConfig('trigger_scheduler.harvest', false) || '15 * * * *';
const pnlTriggerSchedulerSetting =
    getConfig('trigger_scheduler.pnl', false) || '30 * * * *';
const rebalanceTriggerSchedulerSetting =
    getConfig('trigger_scheduler.rebalance', false) || '45 * * * *';
const botUpdateChainPriceSchedulerSetting =
    getConfig('trigger_scheduler.bot_chainlink_check', false) ||
    '00 20 * * * *';
const longPendingTransactionSetting = getConfig('transaction_long_pending');

const botBalanceWarnVault =
    getConfig('bot_balance_warn', false) || '2000000000000000000';

function checkBotAccountBalance() {
    schedule.scheduleJob(botBalanceSchedulerSetting, async () => {
        logger.info(`checkBotAccountBalance running at ${Date.now()}`);
        try {
            await checkAccountBalance(botBalanceWarnVault);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

async function resendPendingTransaction(types) {
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        const oldTransaction = pendingTransactions.get(type);
        const { timestamp, methodName, hash } = oldTransaction;
        const pendingTimes = Date.now() - timestamp;
        const pendingTimeSetting = longPendingTransactionSetting[methodName];
        if (pendingTimes > pendingTimeSetting) {
            logger.info(
                `Transaction[${type}] ${hash} already pending ${
                    pendingTimes / 1000
                } seconds, more than setting ${
                    pendingTimeSetting / 1000
                } seconds, will resend this transaction`
            );
            // eslint-disable-next-line no-await-in-loop
            await pendingTransactionResend(type, oldTransaction);
        }
    }
}
function sendMintedMessage(type, transactionResult) {
    const typeSplit = type.split('-');
    const action = typeSplit[0];
    logger.info(`Transaction type : ${action}`);
    switch (action) {
        case 'pnl':
            pnlTransactionMessage([transactionResult]);
            break;
        case 'invest':
            investTransactionMessage([transactionResult]);
            break;
        case 'harvest':
            harvestTransactionMessage([transactionResult]);
            break;
        case 'rebalance':
            rebalanceTransactionMessage([transactionResult]);
            break;
        default:
            logger.warn(`Transaction type : ${action}`);
    }
}

async function checkLongPendingTransactions() {
    if (!pendingTransactions.size) return;
    const result = await checkPendingTransactions();

    const longPendingTransactions = [];
    for (let i = 0; i < result.length; i += 1) {
        const transactionResult = result[i];
        const { type, transactionReceipt } = transactionResult;
        // eslint-disable-next-line no-await-in-loop
        sendMintedMessage(type, transactionResult);
        if (!transactionReceipt) {
            longPendingTransactions.push(type);
        }
    }
    logger.info(
        `Pending transaction : size ${longPendingTransactions.length}, transactions ${longPendingTransactions}`
    );
    await resendPendingTransaction(longPendingTransactions);
}

function longPendingTransactionsScheduler() {
    schedule.scheduleJob(pendingTransactionSchedulerSetting, async () => {
        logger.info(
            `schedulePendingTransactionsCheck running at ${Date.now()}`
        );
        try {
            await checkLongPendingTransactions();
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function investTriggerScheduler() {
    schedule.scheduleJob(investTriggerSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            const keys = [];
            vaults.forEach((vault) => {
                keys.push(`invest-${vault.address}`);
            });

            const result = await checkPendingTransactions(keys);
            investTransactionMessage(result);
            const investTriggers = await investTrigger();
            logger.info(
                `investTriggers needCall ${investTriggers.needCall} params ${investTriggers.params}`
            );
            if (!investTriggers.needCall) {
                return;
            }

            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;
            await syncNounce();

            if (investTriggers.needCall && investTriggers.params < 3) {
                await invest(currectBlockNumber, investTriggers.params);
            }

            if (investTriggers.needCall && investTriggers.params === 3) {
                await curveInvest(currectBlockNumber);
            }
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function pnlTriggerScheduler() {
    schedule.scheduleJob(pnlTriggerSchedulerSetting, async () => {
        try {
            const result = await checkPendingTransactions(['pnl']);
            pnlTransactionMessage(result);

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
}

function rebalanceTriggerScheduler() {
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async () => {
        try {
            const result = await checkPendingTransactions(['rebalance']);
            rebalanceTransactionMessage(result);

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
}

function harvestTriggerScheduler() {
    schedule.scheduleJob(harvestTriggerSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            const vaultsStrategyLength = getStrategyLength();
            const keys = [];
            for (let i = 0; i < vaults.length; i += 1) {
                const strategyLength = vaultsStrategyLength[i];
                for (let j = 0; j < strategyLength; j += 1) {
                    keys.push(`harvest-${vaults[i].address}-${j}`);
                }
            }
            const result = await checkPendingTransactions(keys);
            harvestTransactionMessage(result);

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
}

function updateChainPrice() {
    schedule.scheduleJob(botUpdateChainPriceSchedulerSetting, async () => {
        try {
            await syncNounce();
            const chainLinkPrice = await updateChainlinkPrice();
            logger.info(`chainLinkPrice: ${chainLinkPrice}`);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function startRegularJobs() {
    checkBotAccountBalance();
    investTriggerScheduler();
    harvestTriggerScheduler();
    pnlTriggerScheduler();
    rebalanceTriggerScheduler();
    longPendingTransactionsScheduler();
    updateChainPrice();
}

module.exports = {
    startRegularJobs,
};
