"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_schedule_1 = __importDefault(require("node-schedule"));
const configUtil_1 = require("../../common/configUtil");
const criticalHandler_1 = require("../handler/criticalHandler");
const checkBotHealth_1 = require("../../common/checkBotHealth");
const discordService_1 = require("../../common/discord/discordService");
const chainUtil_1 = require("../../common/chainUtil");
const priceCheck_1 = require("../handler/priceCheck");
const alertMessageSender_1 = require("../../common/alertMessageSender");
const logger = require('../criticalLogger');
const botCurveSchedulerSetting = configUtil_1.getConfig('trigger_scheduler.bot_curve_check', false) || '00 30 * * * *';
const botBalanceSchedulerSetting = configUtil_1.getConfig('trigger_scheduler.bot_balance_check', false) || '20 * * * *';
const curveBalanceConfig = configUtil_1.getConfig('curve_balance');
const chainlinkPricePairConfig = configUtil_1.getConfig('chainlink_price_pair');
const botBalanceWarnVault = configUtil_1.getConfig('bot_balance', false) || {};
const failedAlertTimes = configUtil_1.getConfig('call_failed_time', false) || 2;
const failedTimes = { priceCheck: 0, accountBalance: 0, priceMonitor: 0 };
function checkCurveHealth() {
    const providerKey = 'default';
    const walletKey = 'rapid';
    node_schedule_1.default.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`Run critical check on : ${new Date()}`);
        try {
            const { chainlinkPricePair } = await criticalHandler_1.curvePriceCheck(providerKey, walletKey);
            await criticalHandler_1.buoyHealthCheckAcrossBlocks(providerKey, walletKey);
            // if (process.env.NODE_ENV === 'mainnet') {
            //     await strategyCheck(providerKey, walletKey);
            // }
            await priceCheck_1.checkChainlinkPrice(chainlinkPricePair, chainlinkPricePairConfig);
            failedTimes.priceCheck = 0;
        }
        catch (error) {
            discordService_1.sendErrorMessageToLogChannel(error);
            failedTimes.priceCheck += 1;
            if (failedTimes.priceCheck >= failedAlertTimes) {
                alertMessageSender_1.sendAlertMessage({
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
    node_schedule_1.default.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`price monitor on : ${new Date()}`);
        try {
            await priceCheck_1.checkCurveCoinRatio(providerKey, curveBalanceConfig);
            failedTimes.priceMonitor = 0;
        }
        catch (error) {
            discordService_1.sendErrorMessageToLogChannel(error);
            failedTimes.priceMonitor += 1;
            if (failedTimes.priceMonitor >= failedAlertTimes) {
                alertMessageSender_1.sendAlertMessage({
                    discord: {
                        description: "[WARN] B15 - Chainlink | Curve price check txn failed, price check action didn't complate",
                    },
                });
            }
        }
    });
}
function checkBotAccountBalance() {
    node_schedule_1.default.scheduleJob(botBalanceSchedulerSetting, async () => {
        logger.info(`checkBotAccountBalance running at ${Date.now()}`);
        try {
            await chainUtil_1.checkAccountsBalance(botBalanceWarnVault);
        }
        catch (error) {
            discordService_1.sendErrorMessageToLogChannel(error);
        }
    });
}
function botLiveCheckScheduler() {
    node_schedule_1.default.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`bot live check running at ${Date.now()}`);
        try {
            const statsUrl = configUtil_1.getConfig('health_endpoint.stats', false);
            checkBotHealth_1.checkServerHealth('stats', [statsUrl], logger).catch((e) => {
                logger.error(e);
            });
            const harvestUrl = configUtil_1.getConfig('health_endpoint.harvest', false);
            checkBotHealth_1.checkServerHealth('harvest', [harvestUrl], logger).catch((e) => {
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
