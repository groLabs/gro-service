const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
// const {
//     etlLbpStats,
//     etlRecovery,
// } = require('../etl/etlLbpStats');
const {
    etlLbpStatsV2,
    etlRecoveryV2,
} = require('../etl/etlLbpStatsV2');
const lbpStatsJobSetting =
    // getConfig('trigger_scheduler.lbp_stats', false) || '*/10 * * * * *'; // in seconds
    // getConfig('trigger_scheduler.lbp_stats', false) || '*/5 * * * *'; // in minutes
    getConfig('trigger_scheduler.lbp_stats', false) || '*/2 * * * *'; // in minutes
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const lbpStatsJob = async () => {
    try {
        logger.info('**LBP: lbpStatsJob initialised');
        schedule.scheduleJob(lbpStatsJobSetting, async () => {
            try {
                logger.info('**LBP: lbpStatsJob started');
                await etlLbpStatsV2();
                logger.info('**LBP: lbpStatsJob finished');
            } catch (err) {
                logger.error(`**LBP: Error in lbpStatsScheduler.js->lbpStatsJob(): ${err}`);
            }
        });
    } catch (err) {
        logger.error(`**LBP: Error in lbpScheduler.js->lbpStatsJob(): ${err}`);
    }

}

const startLbpStatsJobs = async () => {
    try {
        if (await etlRecoveryV2())
        await lbpStatsJob();
    } catch(err) {
        logger.error(`**LBP: Error in lbpScheduler.js->startLbpStatsJobs(): ${err}`);
    }

}

module.exports = {
    startLbpStatsJobs,
};
