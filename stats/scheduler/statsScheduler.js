'use strict';

const schedule = require('node-schedule');
const { getGroStats } = require('../handler/statsHandler');
const logger = require('../statsLogger');
const config = require('config');
let generateStatsSchedulerSetting = '* 10 * * * *';

if (config.has('trigger_scheduler.generate_stats')) {
    generateStatsSchedulerSetting = config.get(
        'trigger_scheduler.generate_stats'
    );
}

const generateStatsFile = async function () {
    schedule.scheduleJob(generateStatsSchedulerSetting, async function () {
        logger.info(`start generate stats`);
        const statsFilename = await getGroStats();
        logger.info(`generate stats file: ${statsFilename}`);
    });
};

const starStatsJobs = function () {
    generateStatsFile();
};

module.exports = {
    starStatsJobs,
};
