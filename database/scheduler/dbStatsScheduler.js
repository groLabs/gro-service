const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const { etlGroStats } = require('../etl/etlGroStats');
const groStatsJobSetting =
    // getConfig('trigger_scheduler.db_gro_stats', false) || '*/10 * * * * *';  // 10 seconds
    getConfig('trigger_scheduler.db_gro_stats', false) || '*/3 * * * *'; // 3 min
const personalStatsJobSetting =
    getConfig('trigger_scheduler.db_personal_stats', false) || '0 3 * * *'; //TODO: TBC every day at 3:00 AM
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const groStatsJob = async () => {
    logger.info('**DB: groStatsJob called');
    schedule.scheduleJob(groStatsJobSetting, async () => {
        try {
            logger.info('**DB: groStatsJob started');
            await etlGroStats();
            logger.info('**DB: groStatsJob finished');
        } catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->groStatsJob(): ${err}`);
        }
    });
}

const personalStatsJob = () => {
    logger.info('**DB: personalStatsJob called');
    schedule.scheduleJob(personalStatsJobSetting, async () => {
        try {
            logger.info('**DB: personalStatsJob started');
            // ETL personal Stats
            logger.info('**DB: personalStatsJob finished');
        } catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->personalStatsJob(): ${err}`);
        }
    });
}

const startDbStatsJobs = () => {
    groStatsJob();
    // personalStatsJob();
}

module.exports = {
    startDbStatsJobs,
};