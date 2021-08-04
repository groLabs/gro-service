const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const {
    curvePriceCheck,
    strategyCheck,
    buoyHealthCheckAcrossBlocks,
} = require('../handler/criticalHandler');
const {
    DISCORD_CHANNELS,
    sendErrorMessageToLogChannel,
} = require('../../common/discord/discordService');
const { checkAccountsBalance } = require('../../common/chainUtil');

const { sendAlertMessage } = require('../../common/alertMessageSender');
const logger = require('../criticalLogger');

const botCurveSchedulerSetting =
    getConfig('trigger_scheduler.bot_curve_check', false) || '00 30 * * * *';
const botBalanceSchedulerSetting =
    getConfig('trigger_scheduler.bot_balance_check', false) || '20 * * * *';

const botBalanceWarnVault =
    getConfig('bot_balance_warn', false) || '2000000000000000000';

const failedAlertTimes = getConfig('call_failed_time', false) || 2;

const failedTimes = { priceCheck: 0, accountBalance: 0 };

function checkCurveHealth() {
    const providerKey = 'default';
    const walletKey = 'rapid';
    schedule.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`Run critical check on : ${new Date()}`);
        try {
            await curvePriceCheck(providerKey, walletKey);
            await buoyHealthCheckAcrossBlocks(providerKey, walletKey);
            // if (process.env.NODE_ENV === 'mainnet') {
            //     await strategyCheck(providerKey, walletKey);
            // }
            failedTimes.priceCheck = 0;
        } catch (error) {
            sendErrorMessageToLogChannel(DISCORD_CHANNELS.botLogs, error);
            failedTimes.priceCheck += 1;
            if (failedTimes.priceCheck >= failedAlertTimes) {
                sendAlertMessage({
                    discord: {
                        description:
                            "[CRIT] B15 - Chainlink | Curve price check txn failed, price check action didn't complate",
                    },
                });
            }
        }
    });
}

function checkBotAccountBalance() {
    schedule.scheduleJob(botBalanceSchedulerSetting, async () => {
        logger.info(`checkBotAccountBalance running at ${Date.now()}`);
        try {
            await checkAccountsBalance(botBalanceWarnVault);
        } catch (error) {
            sendErrorMessageToLogChannel(DISCORD_CHANNELS.botLogs, error);
        }
    });
}

function startCriticalJobs() {
    checkCurveHealth();
    checkBotAccountBalance();
}

module.exports = {
    startCriticalJobs,
};
