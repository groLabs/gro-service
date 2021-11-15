const schedule = require('node-schedule');
const { getConfig } = require('../../dist/common/configUtil');
const { etlGroStats } = require('../etl/etlGroStats');
const { etlPriceCheck } = require('../etl/etlPriceCheck');
const { etlPersonalStats } = require('../etl/etlPersonalStats');
const { calcLoadingDateRange } = require('../common/personalUtil');
const { loadContractInfoFromRegistry } = require('../../registry/registryLoader');
const groStatsJobSetting =
    // getConfig('trigger_scheduler.db_gro_stats', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
    getConfig('trigger_scheduler.db_gro_stats', false) || '*/3 * * * *'; // 3 mins [PRODUCTION]
const priceCheckJobSetting =
    // getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
    getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * *'; // 30 mins [PRODUCTION]
const personalStatsJobSetting =
    // getConfig('trigger_scheduler.db_personal_stats', false) || '*/120 * * * * *'; // X seconds [TESTING]
    getConfig('trigger_scheduler.db_personal_stats', false) || '5 0 * * *'; // everyday at 00:05 AM [PRODUCTION]
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

const personalStatsJob = async () => {
    await loadContractInfoFromRegistry();
    logger.info('**DB: personalStatsJob initialised');
    schedule.scheduleJob(personalStatsJobSetting, async () => {
        try {
            logger.info('**DB: personalStatsJob started');
            const res = await calcLoadingDateRange();
            if (res.length > 0) {
                logger.info(`**DB: Starting personal stats load (from: ${res[0]}, to: ${res[1]})`);
                await etlPersonalStats(
                    res[0], // start date 'DD/MM/YYYY'
                    res[1], // end date 'DD/MM/YYYY'
                    null    // address
                );
            } else {
                logger.info(`**DB: No personal stats load required`);
            }
            logger.info('**DB: personalStatsJob finished');
        } catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->personalStatsJob(): ${err}`);
        }
    });
}

const startDbStatsJobs = () => {
    groStatsJob();
    priceCheckJob();
    // personalStatsJob();
}

module.exports = {
    startDbStatsJobs,
};
