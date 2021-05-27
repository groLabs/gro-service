const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const {
    curvePriceCheck,
    strategyCheck,
} = require('../handler/criticalHandler');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const logger = require('../criticalLogger');

const botCurveSchedulerSetting =
    getConfig('trigger_scheduler.bot_curve_check', false) || '00 30 * * * *';

function checkCurveHealth() {
    schedule.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`Run critical check on : ${new Date()}`);
        try {
            await curvePriceCheck();
            // if (process.env.NODE_ENV === 'mainnet') {
            //     await strategyCheck();
            // }
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function startCriticalJobs() {
    checkCurveHealth();
}

module.exports = {
    startCriticalJobs,
};
