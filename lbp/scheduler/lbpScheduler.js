const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const {
    etlLbpStats,
    etlRecovery,
} = require('../etl/etlLbpStats');
const lbpStatsJobSetting =
    // getConfig('trigger_scheduler.lbp_stats', false) || '*/10 * * * * *'; // in seconds
    // getConfig('trigger_scheduler.lbp_stats', false) || '*/5 * * * *'; // in minutes
    getConfig('trigger_scheduler.lbp_stats', false) || '*/2 * * * *'; // in minutes
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

const startLbpStatsJobs = async () => {
    if (await etlRecovery())
        await lbpStatsJob();
}

module.exports = {
    startLbpStatsJobs,
};
