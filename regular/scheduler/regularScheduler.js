const config = require('config');
const schedule = require('node-schedule');
const { BigNumber } = require('ethers');
const {
    getDefaultProvider,
    getNonceManager,
    syncNounce,
    checkPendingTransactions,
    checkAccountBalance,
} = require('../../common/chainUtil');
const { pendingTransactions } = require('../../common/storage');
const { ETH_DECIMAL, div, shortAccount } = require('../../common/digitalUtil');
const {
    MESSAGE_EMOJI,
    sendMessageToLogChannel,
    sendMessageToAlertChannel,
    sendMessageToProtocolEventChannel,
    MESSAGE_TYPES,
} = require('../../common/discord/discordService');
const {
    SettingError,
    BlockChainCallError,
    ContractCallError,
} = require('../../common/error');
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
    generateDepositReport,
    generateWithdrawReport,
    generateGvtTransfer,
    generatePwrdTransfer,
} = require('../handler/eventHandler');
const logger = require('../regularLogger');

const provider = getDefaultProvider();
const nonceManager = getNonceManager();
let pendingTransactionSchedulerSetting = '30 * * * *';
let botBalanceSchedulerSetting = '20 * * * *';
let investTriggerSchedulerSetting = '0 * * * *';
let harvestTriggerSchedulerSetting = '15 * * * *';
let pnlTriggerSchedulerSetting = '30 * * * *';
let rebalanceTriggerSchedulerSetting = '45 * * * *';
let depositWithdrawEventSchedulerSetting = '*/5 * * * *';
let botUpdateChainPriceSchedulerSetting = '00 20 * * * *';

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

if (config.has('trigger_scheduler.bot_chainlink_check')) {
    botUpdateChainPriceSchedulerSetting = config.get(
        'trigger_scheduler.bot_chainlink_check'
    );
}

async function getCurrentBlockNumber() {
    const block = await provider.getBlockNumber().catch((error) => {
        logger.error(error);
        throw new BlockChainCallError(
            'Get current block number from chain failed.'
        );
    });
    return block;
}

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
            const keys = ['curveInvest'];
            vaults.forEach((vault) => {
                keys.push(`invest-${vault.address}`);
            });

            await checkPendingTransactions(keys);

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
}

function rebalanceTriggerScheduler() {
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async () => {
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
}

function depositWithdrawEventScheduler() {
    schedule.scheduleJob(depositWithdrawEventSchedulerSetting, async () => {
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
    updateChainPrice();
}

module.exports = {
    startRegularJobs,
};
