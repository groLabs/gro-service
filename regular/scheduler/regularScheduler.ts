import schedule from 'node-schedule';
import { syncManagerNonce, checkAccountsBalance, getCurrentBlockNumber } from '../../common/chainUtil';
import { checkServerHealth } from '../../common/checkBotHealth';
import { checkPendingTransactions, syncPendingTransactions } from '../../common/pendingTransaction';
import { pendingTransactions } from '../../common/storage';
import { sendErrorMessageToLogChannel } from '../../common/discord/discordService';
import { pendingTransactionResend } from '../../gasPrice/transaction';
import { investTrigger, rebalanceTrigger, harvestOneTrigger, distributeCurveVaultTrigger } from '../handler/triggerHandler';
import { invest, rebalance, harvest, curveInvest, priceSafetyCheck, distributeCurveVault } from '../handler/actionHandler';
import { getVaults, getStrategyLength } from '../../contract/allContracts';
import { getConfig } from '../../common/configUtil';
import { investTransactionMessage } from '../../discordMessage/investMessage';
import { pnlTransactionMessage } from '../../discordMessage/pnlMessage';
import { rebalanceTransactionMessage } from '../../discordMessage/rebalanceMessage';
import { harvestTransactionMessage } from '../../discordMessage/harvestMessage';
import { updatePriceTransactionMessage } from '../../discordMessage/otherMessage';
import { distributeCurveVaultTransactionMessage } from '../../discordMessage/distributeCurveMessage';
import { sendAlertMessage } from '../../common/alertMessageSender';

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
const rebalanceTriggerSchedulerSetting =
    getConfig('trigger_scheduler.rebalance', false) || '45 * * * *';
const safetyCheckSetting =
    getConfig('trigger_scheduler.safety_check', false) || '*/5 * * * *';
const longPendingTransactionSetting = getConfig('transaction_long_pending');

const botBalanceWarnVault = getConfig('bot_balance', false) || {};

const failedTimes = { safetyCheck: 0 };

function checkBotAccountBalance() {
    schedule.scheduleJob(botBalanceSchedulerSetting, async () => {
        logger.info(`checkBotAccountBalance running at ${Date.now()}`);
        try {
            await checkAccountsBalance(botBalanceWarnVault);
        } catch (error) {
            sendErrorMessageToLogChannel(error);
        }
    });
}

function safetyCheckScheduler() {
    const providerKey = 'default';
    schedule.scheduleJob(safetyCheckSetting, async () => {
        logger.info(`priceSafetyCheck running at ${Date.now()}`);
        try {
            await priceSafetyCheck(providerKey);
            failedTimes.safetyCheck = 0;
        } catch (error) {
            sendErrorMessageToLogChannel(error);
            failedTimes.safetyCheck += 1;
            if (failedTimes.safetyCheck >= 2) {
                sendAlertMessage({
                    discord: {
                        description:
                            '[WARN] B8 - Buoy’s safetycheck txn failed, price safety check didn’t complete',
                    },
                });
            }
        }
    });
}

async function resendPendingTransaction(types) {
    for (let i = 0; i < types.length; i += 1) {
        const type = types[i];
        const oldTransaction = pendingTransactions.get(type);
        const { timestamp, methodName, hash } = oldTransaction;
        const pendingTimes = Date.now() - timestamp;
        const pendingTimeSetting =
            longPendingTransactionSetting[methodName] || 120000;
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
        case 'chainPrice':
            updatePriceTransactionMessage([transactionResult]);
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
        `Long Pending transaction : size ${longPendingTransactions.length}, transactions ${longPendingTransactions}`
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
            sendErrorMessageToLogChannel(error);
        }
    });
}

function investTriggerScheduler() {
    const providerKey = 'default';
    const walletKey = 'low';
    schedule.scheduleJob(investTriggerSchedulerSetting, async () => {
        try {
            const vaults = getVaults(providerKey, walletKey);
            const keys = [];
            vaults.forEach((vault) => {
                keys.push(`invest-${vault.address}`);
            });

            const result = await checkPendingTransactions(keys);
            investTransactionMessage(result);

            const vaultsStrategyLength = getStrategyLength();
            const strategyKeys = [];
            for (let i = 0; i < vaults.length; i += 1) {
                const strategyLength = vaultsStrategyLength[i];
                for (let j = 0; j < strategyLength; j += 1) {
                    strategyKeys.push(`harvest-${vaults[i].address}-${j}`);
                }
            }
            const strategyResult = await checkPendingTransactions(strategyKeys);
            harvestTransactionMessage(strategyResult);

            const investTriggers = await investTrigger(providerKey, walletKey);
            logger.info(
                `investTriggers needCall ${investTriggers.needCall} params ${investTriggers.params}`
            );
            if (!investTriggers.needCall) {
                return;
            }

            const currectBlockNumber = await getCurrentBlockNumber(providerKey);
            if (!currectBlockNumber) return;
            await syncManagerNonce(providerKey, walletKey);

            if (investTriggers.needCall && investTriggers.params < 3) {
                await invest(
                    currectBlockNumber,
                    investTriggers.params,
                    providerKey,
                    walletKey
                );
            }

            if (investTriggers.needCall && investTriggers.params === 3) {
                await curveInvest(currectBlockNumber, providerKey, walletKey);
            }
        } catch (error) {
            sendErrorMessageToLogChannel(error);

            const discordMessage = {
                description:
                    "[WARN] B1 - InvestTrigger | Invest txn failed, InvestTrigger action didn't complate",
            };
            sendAlertMessage({
                discord: discordMessage,
            });
        }
    });
}

function rebalanceTriggerScheduler() {
    const providerKey = 'default';
    const walletKey = 'fast';
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async () => {
        try {
            const result = await checkPendingTransactions(['rebalance']);
            rebalanceTransactionMessage(result);

            const triggerResult = await rebalanceTrigger(
                providerKey,
                walletKey
            );

            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber(providerKey);
            if (!currectBlockNumber) return;

            await syncManagerNonce(providerKey, walletKey);
            await rebalance(currectBlockNumber, providerKey, walletKey);
        } catch (error) {
            sendErrorMessageToLogChannel(error);

            const discordMessage = {
                description:
                    "[WARN] B3 - RebalanceTrigger | Rebalance txn failed, RebalanceTrigger action didn't complate",
            };
            sendAlertMessage({
                discord: discordMessage,
            });
        }
    });
}

function curveExposureMaintenanceScheduler() {
    const providerKey = 'default';
    const walletKey = 'fast';
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async () => {
        try {
            const result = await checkPendingTransactions([
                'withdrawToAdapter',
                'distributeCurveAssets',
            ]);
            distributeCurveVaultTransactionMessage(result);

            const triggerResult = await distributeCurveVaultTrigger(
                providerKey,
                walletKey
            );

            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber(providerKey);
            if (!currectBlockNumber) return;

            await syncManagerNonce(providerKey, walletKey);
            await distributeCurveVault(
                currectBlockNumber,
                providerKey,
                walletKey,
                triggerResult.params.amount,
                triggerResult.params.delta
            );
        } catch (error) {
            sendErrorMessageToLogChannel(error);

            const discordMessage = {
                description:
                    "[CRIT] B15 - CurveDistribute | CurveDistribute txn failed, CurveDistribute action didn't complete",
            };
            sendAlertMessage({
                discord: discordMessage,
                pagerduty: {
                    title: '[CRIT] B15 - CurveDistribute | CurveDistribute txn failed',
                    description: discordMessage.description,
                    urgency: 'low',
                },
            });
        }
    });
}

function harvestTriggerScheduler() {
    const providerKey = 'default';
    const walletKey = 'standard';
    schedule.scheduleJob(harvestTriggerSchedulerSetting, async () => {
        try {
            const vaults = getVaults(providerKey, walletKey);
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

            const triggerResult = await harvestOneTrigger(
                providerKey,
                walletKey
            );
            if (!triggerResult.needCall) return;

            const currectBlockNumber = await getCurrentBlockNumber(providerKey);
            if (!currectBlockNumber) return;

            await syncManagerNonce(providerKey, walletKey);
            await harvest(
                currectBlockNumber,
                triggerResult.params,
                providerKey,
                walletKey
            );
        } catch (error) {
            sendErrorMessageToLogChannel(error);

            const discordMessage = {
                description:
                    "[WARN] B2 -  HarvestTrigger | Harvest txn failed, HarvestTrigger action didn't complate",
            };
            sendAlertMessage({
                discord: discordMessage,
            });
        }
    });
}

function botLiveCheckScheduler() {
    schedule.scheduleJob(safetyCheckSetting, async () => {
        logger.info(`bot live check running at ${Date.now()}`);
        try {
            const statsUrl = getConfig('health_endpoint.stats', false);
            checkServerHealth('stats', [statsUrl], logger).catch((e) => {
                logger.error(e);
            });
            const criticUrl = getConfig('health_endpoint.critic', false);
            checkServerHealth('critic', [criticUrl], logger).catch((e) => {
                logger.error(e);
            });
        } catch (error) {
            logger.error(error);
        }
    });
}

function startRegularJobs() {
    try {
        syncPendingTransactions();
    } catch (e) {
        console.log(e);
    }
    checkBotAccountBalance();
    investTriggerScheduler();
    harvestTriggerScheduler();
    rebalanceTriggerScheduler();
    safetyCheckScheduler();
    longPendingTransactionsScheduler();
    botLiveCheckScheduler();
    curveExposureMaintenanceScheduler();
}

export default {
    startRegularJobs,
};
