'use strict';

const schedule = require('node-schedule');
const { curveCheck } = require('../handler/criticalHandler');
const logger = require('../../common/logger');
const config = require('config');
let botCurveSchedulerSetting = '00 20 * * * *';

if (config.has('trigger_scheduler.bot_curve_check')) {
    botCurveSchedulerSetting = config.get('trigger_scheduler.bot_curve_check');
}

const checkCurveHealth = function () {
    schedule.scheduleJob(botCurveSchedulerSetting, async function () {
        let curveHealth = await curveCheck();
        logger.info(`curve health: ${curveHealth}`);
    });
};

const startCriticalJobs = function () {
    checkCurveHealth();
};

module.exports = {
    startCriticalJobs,
};
