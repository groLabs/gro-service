const schedule = require('node-schedule');
const config = require('config');
const { curveCheck } = require('../handler/criticalHandler');
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
        try {
            const curveHealth = await curveCheck();
            logger.info(`curve health: ${curveHealth}`);
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
