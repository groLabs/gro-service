const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const {
    curvePriceCheck,
    strategyCheck,
    buoyHealthCheckAcrossBlocks,
} = require('../handler/criticalHandler');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const { checkAccountsBalance } = require('../../common/chainUtil');
const logger = require('../criticalLogger');

const botCurveSchedulerSetting =
    getConfig('trigger_scheduler.bot_curve_check', false) || '00 30 * * * *';
const botBalanceSchedulerSetting =
    getConfig('trigger_scheduler.bot_balance_check', false) || '20 * * * *';

const botBalanceWarnVault =
    getConfig('bot_balance_warn', false) || '2000000000000000000';

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
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function checkBotAccountBalance() {
    schedule.scheduleJob(botBalanceSchedulerSetting, async () => {
        logger.info(`checkBotAccountBalance running at ${Date.now()}`);
        try {
            await checkAccountsBalance(botBalanceWarnVault);
        } catch (error) {
            sendMessageToAlertChannel(error);
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
