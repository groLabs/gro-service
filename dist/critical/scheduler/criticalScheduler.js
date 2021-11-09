"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const { curvePriceCheck, strategyCheck, buoyHealthCheckAcrossBlocks, } = require('../handler/criticalHandler');
const { checkServerHealth } = require('../../common/checkBotHealth');
const { sendErrorMessageToLogChannel, } = require('../../dist/common/discord/discordService').default;
const { checkAccountsBalance } = require('../../common/chainUtil');
const { checkCurveCoinRatio, checkChainlinkPrice, } = require('../handler/priceCheck');
const { sendAlertMessage } = require('../../common/alertMessageSender');
const logger = require('../criticalLogger');
const botCurveSchedulerSetting = getConfig('trigger_scheduler.bot_curve_check', false) || '00 30 * * * *';
const botBalanceSchedulerSetting = getConfig('trigger_scheduler.bot_balance_check', false) || '20 * * * *';
const curveBalanceConfig = getConfig('curve_balance');
const chainlinkPricePairConfig = getConfig('chainlink_price_pair');
const botBalanceWarnVault = getConfig('bot_balance', false) || {};
const failedAlertTimes = getConfig('call_failed_time', false) || 2;
const failedTimes = { priceCheck: 0, accountBalance: 0, priceMonitor: 0 };
function checkCurveHealth() {
    const providerKey = 'default';
    const walletKey = 'rapid';
    schedule.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`Run critical check on : ${new Date()}`);
        try {
            const { chainlinkPricePair } = await curvePriceCheck(providerKey, walletKey);
            await buoyHealthCheckAcrossBlocks(providerKey, walletKey);
            // if (process.env.NODE_ENV === 'mainnet') {
            //     await strategyCheck(providerKey, walletKey);
            // }
            await checkChainlinkPrice(chainlinkPricePair, chainlinkPricePairConfig);
            failedTimes.priceCheck = 0;
        }
        catch (error) {
            sendErrorMessageToLogChannel(error);
            failedTimes.priceCheck += 1;
            if (failedTimes.priceCheck >= failedAlertTimes) {
                sendAlertMessage({
                    discord: {
                        description: "[WARN] B15 - Chainlink | Curve price check txn failed, price check action didn't complate",
                    },
                });
            }
        }
    });
}
function priceMonitor() {
    const providerKey = 'default';
    schedule.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`price monitor on : ${new Date()}`);
        try {
            await checkCurveCoinRatio(providerKey, curveBalanceConfig);
            failedTimes.priceMonitor = 0;
        }
        catch (error) {
            sendErrorMessageToLogChannel(error);
            failedTimes.priceMonitor += 1;
            if (failedTimes.priceMonitor >= failedAlertTimes) {
                sendAlertMessage({
                    discord: {
                        description: "[WARN] B15 - Chainlink | Curve price check txn failed, price check action didn't complate",
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
        }
        catch (error) {
            sendErrorMessageToLogChannel(error);
        }
    });
}
function botLiveCheckScheduler() {
    schedule.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`bot live check running at ${Date.now()}`);
        try {
            const statsUrl = getConfig('health_endpoint.stats', false);
            checkServerHealth('stats', [statsUrl], logger).catch((e) => {
                logger.error(e);
            });
            const harvestUrl = getConfig('health_endpoint.harvest', false);
            checkServerHealth('harvest', [harvestUrl], logger).catch((e) => {
                logger.error(e);
            });
        }
        catch (error) {
            logger.error(error);
        }
    });
}
function startCriticalJobs() {
    checkCurveHealth();
    checkBotAccountBalance();
    priceMonitor();
    botLiveCheckScheduler();
}
exports.default = startCriticalJobs;
