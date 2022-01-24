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
const botCurveSchedulerSetting = (0, configUtil_1.getConfig)('trigger_scheduler.bot_curve_check', false) || '00 30 * * * *';
const botBalanceSchedulerSetting = (0, configUtil_1.getConfig)('trigger_scheduler.bot_balance_check', false) || '20 * * * *';
const curveBalanceConfig = (0, configUtil_1.getConfig)('curve_balance');
const chainlinkPricePairConfig = (0, configUtil_1.getConfig)('chainlink_price_pair');
const botBalanceWarnVault = (0, configUtil_1.getConfig)('bot_balance', false) || {};
const failedAlertTimes = (0, configUtil_1.getConfig)('call_failed_time', false) || 2;
const failedTimes = { priceCheck: 0, accountBalance: 0, priceMonitor: 0 };
function checkCurveHealth() {
    const providerKey = 'default';
    const walletKey = 'rapid';
    node_schedule_1.default.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`Run critical check on : ${new Date()}`);
        try {
            const { chainlinkPricePair } = await (0, criticalHandler_1.curvePriceCheck)(providerKey, walletKey);
            await (0, criticalHandler_1.buoyHealthCheckAcrossBlocks)(providerKey, walletKey);
            // if (process.env.NODE_ENV === 'mainnet') {
            //     await strategyCheck(providerKey, walletKey);
            // }
            await (0, priceCheck_1.checkChainlinkPrice)(chainlinkPricePair, chainlinkPricePairConfig);
            failedTimes.priceCheck = 0;
        }
        catch (error) {
            (0, discordService_1.sendErrorMessageToLogChannel)(error);
            failedTimes.priceCheck += 1;
            if (failedTimes.priceCheck >= failedAlertTimes) {
                (0, alertMessageSender_1.sendAlertMessage)({
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
            await (0, priceCheck_1.checkCurveCoinRatio)(providerKey, curveBalanceConfig);
            failedTimes.priceMonitor = 0;
        }
        catch (error) {
            (0, discordService_1.sendErrorMessageToLogChannel)(error);
            failedTimes.priceMonitor += 1;
            if (failedTimes.priceMonitor >= failedAlertTimes) {
                (0, alertMessageSender_1.sendAlertMessage)({
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
            await (0, chainUtil_1.checkAccountsBalance)(botBalanceWarnVault);
        }
        catch (error) {
            (0, discordService_1.sendErrorMessageToLogChannel)(error);
        }
    });
}
function botLiveCheckScheduler() {
    node_schedule_1.default.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`bot live check running at ${Date.now()}`);
        try {
            const statsUrl = (0, configUtil_1.getConfig)('health_endpoint.stats', false);
            (0, checkBotHealth_1.checkServerHealth)('stats', [statsUrl], logger).catch((e) => {
                logger.error(e);
            });
            const harvestUrl = (0, configUtil_1.getConfig)('health_endpoint.harvest', false);
            (0, checkBotHealth_1.checkServerHealth)('harvest', [harvestUrl], logger).catch((e) => {
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
