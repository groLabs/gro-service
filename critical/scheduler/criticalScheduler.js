'use strict';

const schedule = require('node-schedule');
const { curveCheck } = require('../handler/criticalHandler');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const logger = require('../criticalLogger');
const config = require('config');
let botCurveSchedulerSetting = '00 20 * * * *';

if (config.has('trigger_scheduler.bot_curve_check')) {
    botCurveSchedulerSetting = config.get('trigger_scheduler.bot_curve_check');
}

const checkCurveHealth = function () {
    schedule.scheduleJob(botCurveSchedulerSetting, async function () {
        try {
            let curveHealth = await curveCheck();
            logger.info(`curve health: ${curveHealth}`);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const startCriticalJobs = function () {
    checkCurveHealth();
};

module.exports = {
    startCriticalJobs,
};
