/// Sergi to create a cron to be called every 1 or 5 minutes to initiate the LBP data extraction
/// and load into tables

const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const { etlLbpStats } = require('../etl/etlLbpStats');
const lbpStatsJobSetting =
    getConfig('trigger_scheduler.lbp_stats', false) || '*/10 * * * * *'; // in seconds
    // getConfig('trigger_scheduler.lbp_stats', false) || '*/5 * * * *'; // in minutes
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const lbpStatsJob = async () => {
    logger.info('**DB: lbpStatsJob initialised');
    schedule.scheduleJob(lbpStatsJobSetting, async () => {
        try {
            logger.info('**DB: lbpStatsJob started');
            await etlLbpStats();
            logger.info('**DB: lbpStatsJob finished');
        } catch (err) {
            logger.error(`**DB: Error in lbpStatsScheduler.js->lbpStatsJob(): ${err}`);
        }
    });
}

const startLbpStatsJobs = () => {
    lbpStatsJob();
}

module.exports = {
    startLbpStatsJobs,
};
