"use strict";
const schedule = require('node-schedule');
const { getConfig } = require('../../common/configUtil');
const { etlLbpStatsV2, etlLbpStatsV2_vol, etlRecoveryV2, } = require('../etl/etlLbpStatsV2');
const lbpStatsJobSetting = 
// getConfig('trigger_scheduler.lbp_stats', false) || '*/20 * * * * *'; // in seconds
getConfig('trigger_scheduler.lbp_stats', false) || '*/5 * * * *'; // in minutes
// getConfig('trigger_scheduler.lbp_stats', false) || '*/2 * * * *'; // in minutes
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const lbpStatsJob = async () => {
    try {
        logger.info('**LBP: lbpStatsJob initialised');
        schedule.scheduleJob(lbpStatsJobSetting, async () => {
            try {
                logger.info('**LBP: lbpStatsJob started');
                //await etlLbpStatsV2();    // not including trading volume
                await etlLbpStatsV2_vol(); // including trading volume
                logger.info('**LBP: lbpStatsJob finished');
            }
            catch (err) {
                logger.error(`**LBP: Error in lbpStatsScheduler.js->lbpStatsJob(): ${err}`);
            }
        });
    }
    catch (err) {
        logger.error(`**LBP: Error in lbpScheduler.js->lbpStatsJob(): ${err}`);
    }
};
const startLbpStatsJobs = async () => {
    try {
        if (await etlRecoveryV2()) {
            await lbpStatsJob();
        }
        else {
            logger.error(`**LBP: Bot is stopped due to issues during recovery phase`);
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in lbpScheduler.js->startLbpStatsJobs(): ${err}`);
    }
};
module.exports = {
    startLbpStatsJobs,
};
