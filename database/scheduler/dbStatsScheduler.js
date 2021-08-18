const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const { etlGroStats } = require('../etl/etlGroStats');
const { etlPriceCheck} = require('../etl/etlPriceCheck');
const groStatsJobSetting =
    // getConfig('trigger_scheduler.db_gro_stats', false) || '*/30 * * * * *';  // 30 seconds
    getConfig('trigger_scheduler.db_gro_stats', false) || '*/3 * * * *'; // 3 mins [PRODUCTION]
const priceCheckJobSetting = 
    // getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * * *';  // 30 seconds
    getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * *'; // 30 mins [PRODUCTION]
// const personalStatsJobSetting =
//     getConfig('trigger_scheduler.db_personal_stats', false) || '0 3 * * *'; //TODO: TBC every day at 3:00 AM
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const groStatsJob = async () => {
    logger.info('**DB: groStatsJob initialised');
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

const priceCheckJob = async () => {
    logger.info('**DB: priceCheckJob initialised');
    schedule.scheduleJob(priceCheckJobSetting, async () => {
        try {
            logger.info('**DB: priceCheck started');
            await etlPriceCheck();
            logger.info('**DB: priceCheck finished');
        } catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->priceCheckJob(): ${err}`);
        }
    });
}

// const personalStatsJob = () => {
//     logger.info('**DB: personalStatsJob called');
//     schedule.scheduleJob(personalStatsJobSetting, async () => {
//         try {
//             logger.info('**DB: personalStatsJob started');
//             // ETL personal Stats
//             logger.info('**DB: personalStatsJob finished');
//         } catch (err) {
//             logger.error(`**DB: Error in dbStatsScheduler.js->personalStatsJob(): ${err}`);
//         }
//     });
// }

const startDbStatsJobs = () => {
    groStatsJob();
    priceCheckJob();
    // personalStatsJob();
}

module.exports = {
    startDbStatsJobs,
};