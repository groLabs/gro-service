const schedule = require('node-schedule');
const config = require('config');
const { curveCheck, strategyCheck } = require('../handler/criticalHandler');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const logger = require('../criticalLogger');

let botCurveSchedulerSetting = '00 20 * * * *';

if (config.has('trigger_scheduler.bot_curve_check')) {
    botCurveSchedulerSetting = config.get('trigger_scheduler.bot_curve_check');
}

function checkCurveHealth() {
    schedule.scheduleJob(botCurveSchedulerSetting, async () => {
        logger.info(`Run critical check on : ${new Date()}`);
        try {
            await curveCheck();
            await strategyCheck();
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
