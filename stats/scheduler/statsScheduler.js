'use strict';

const schedule = require('node-schedule');
const { generateGroStatsFile } = require('../handler/statsHandler');
const logger = require('../statsLogger.js');
const config = require('config');
let generateStatsSchedulerSetting = '00 10 * * * *';

if (config.has('trigger_scheduler.generate_stats')) {
    generateStatsSchedulerSetting = config.get(
        'trigger_scheduler.generate_stats'
    );
}

const generateStatsFile = async function () {
    schedule.scheduleJob(generateStatsSchedulerSetting, async function () {
        try {
            logger.info(`start generate stats`);
            const statsFilename = await generateGroStatsFile();
            logger.info(`generate stats file: ${statsFilename}`);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
};

const starStatsJobs = function () {
    generateStatsFile();
};

module.exports = {
    starStatsJobs,
};
