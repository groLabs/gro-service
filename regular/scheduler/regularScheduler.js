const schedule = require('node-schedule');
const {
    getDefaultProvider,
    getNonceManager,
    syncNounce,
    checkAccountBalance,
    getCurrentBlockNumber,
} = require('../../common/chainUtil');
const { checkPendingTransactions } = require('../../common/pendingTransaction');
const { pendingTransactions } = require('../../common/storage');
const {
    MESSAGE_EMOJI,
    sendMessageToAlertChannel,
    sendMessageToProtocolEventChannel,
} = require('../../common/discord/discordService');
const { SettingError, BlockChainCallError } = require('../../common/error');
const {
    investTrigger,
    pnlTrigger,
    rebalanceTrigger,
    harvestOneTrigger,
    curveInvestTrigger,
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
const {
    getLastBlockNumber,
    updateLastBlockNumber,
    generateDepositAndWithdrawReport,
    generateSummaryReport,
} = require('../handler/eventHandler');
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

const provider = getDefaultProvider();
const nonceManager = getNonceManager();
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
const depositWithdrawEventSchedulerSetting =
    getConfig('trigger_scheduler.deposit_withdraw_event', false) ||
    '*/5 * * * *';
const eventSummarySchedulerSetting =
    getConfig('trigger_scheduler.event_summary', false) || '00 * * * *';
const botUpdateChainPriceSchedulerSetting =
    getConfig('trigger_scheduler.bot_chainlink_check', false) ||
    '00 20 * * * *';

const botBalanceWarnVault =
    getConfig('bot_balance_warn', false) || '2000000000000000000';
const botAddressKey = `BOT_ADDRESS_${process.env.BOT_ENV}`;
if (!process.env[botAddressKey]) {
    const err = new SettingError(
        `Environment variable ${botAddressKey} are not set.`
    );
    logger.error(err);
    throw err;
}

const botAccount = process.env[botAddressKey];

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

async function checkPendingTransaction(type, oldTransaction) {
    const { hash, label: msgLabel } = oldTransaction;
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
        type: msgLabel,
        params: botAccount,
    };

    if (!transactionReceipt) {
        msgObj.message = `${type} transaction: ${hash} is still pending.`;
        logger.info(msgObj.message);
        sendMessageToProtocolEventChannel(msgObj);
    } else {
        // remove hash from pending transactions
        pendingTransactions.delete(type);
        const label = 'TX';
        if (transactionReceipt.status === 1) {
            msgObj.message = `${type} transaction: ${hash} has mined to chain.`;
            msgObj.description = `${label} ${type} action was minted to chain`;
        } else {
            msgObj.message = `${type} transaction: ${hash} has reverted.`;
            msgObj.emojis = [MESSAGE_EMOJI.reverted];
            msgObj.description = `${label} ${type} action has been reverted`;
        }
        msgObj.urls = [];
        msgObj.urls.push({
            label,
            type: 'tx',
            value: hash,
        });
        logger.info(JSON.stringify(msgObj));
        sendMessageToProtocolEventChannel(msgObj);
    }
}

async function checkLongPendingTransactions() {
    if (!pendingTransactions.size) return;
    const types = pendingTransactions.keys();
    const pendingCheckPromises = [];
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        const oldTransaction = pendingTransactions.get(type);
        pendingCheckPromises.push(
            checkPendingTransaction(type, oldTransaction)
        );
    }
    await Promise.all(pendingCheckPromises);
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
            const investTriggers = await Promise.all([
                investTrigger(),
                curveInvestTrigger(),
            ]);

            if (!investTriggers[0].needCall && !investTriggers[1].needCall) {
                return;
            }

            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;

            await syncNounce();
            if (investTriggers[0].needCall) {
                await invest(currectBlockNumber, investTriggers[0].params);
            }

            if (investTriggers[1].needCall) {
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

function depositWithdrawEventScheduler() {
    schedule.scheduleJob(depositWithdrawEventSchedulerSetting, async () => {
        try {
            const lastBlockNumber = getLastBlockNumber(
                'lastDepositAndWithdrawBlockNumber'
            );
            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;
            await Promise.all([
                generateDepositAndWithdrawReport(
                    lastBlockNumber,
                    currectBlockNumber
                ),
            ]);
            updateLastBlockNumber(
                currectBlockNumber,
                'lastDepositAndWithdrawBlockNumber'
            );
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function EventSummaryScheduler() {
    schedule.scheduleJob(eventSummarySchedulerSetting, async () => {
        try {
            const lastBlockNumber = getLastBlockNumber(
                'lastSummaryBlockNumber'
            );
            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;
            await Promise.all([
                generateSummaryReport(lastBlockNumber, currectBlockNumber),
            ]);
            updateLastBlockNumber(currectBlockNumber, 'lastSummaryBlockNumber');
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function updateChainPrice() {
    schedule.scheduleJob(botUpdateChainPriceSchedulerSetting, async () => {
        try {
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
    depositWithdrawEventScheduler();
    EventSummaryScheduler();
    updateChainPrice();
}

module.exports = {
    startRegularJobs,
};
