"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDbStatsJobs = void 0;
const node_schedule_1 = __importDefault(require("node-schedule"));
const configUtil_1 = require("../../common/configUtil");
const etlGroStats_1 = require("../etl/etlGroStats");
const etlPriceCheck_1 = require("../etl/etlPriceCheck");
const etlPersonalStats_1 = require("../etl/etlPersonalStats");
const personalUtil_1 = require("../common/personalUtil");
const registryLoader_1 = require("../../registry/registryLoader");
const groStatsJobSetting = 
// getConfig('trigger_scheduler.db_gro_stats', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
(0, configUtil_1.getConfig)('trigger_scheduler.db_gro_stats', false) || '*/3 * * * *'; // 3 mins [PRODUCTION]
const priceCheckJobSetting = 
// getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
(0, configUtil_1.getConfig)('trigger_scheduler.db_price_check', false) || '*/30 * * * *'; // 30 mins [PRODUCTION]
const personalStatsJobSetting = 
// getConfig('trigger_scheduler.db_personal_stats', false) || '*/120 * * * * *'; // X seconds [TESTING]
(0, configUtil_1.getConfig)('trigger_scheduler.db_personal_stats', false) || '5 0 * * *'; // everyday at 00:05 AM [PRODUCTION]
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const groStatsJob = async () => {
    logger.info('**DB: groStatsJob initialised');
    node_schedule_1.default.scheduleJob(groStatsJobSetting, async () => {
        try {
            logger.info('**DB: groStatsJob started');
            await (0, etlGroStats_1.etlGroStats)();
            logger.info('**DB: groStatsJob finished');
        }
        catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->groStatsJob(): ${err}`);
        }
    });
};
const priceCheckJob = async () => {
    logger.info('**DB: priceCheckJob initialised');
    node_schedule_1.default.scheduleJob(priceCheckJobSetting, async () => {
        try {
            logger.info('**DB: priceCheck started');
            await (0, etlPriceCheck_1.etlPriceCheck)();
            logger.info('**DB: priceCheck finished');
        }
        catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->priceCheckJob(): ${err}`);
        }
    });
};
const personalStatsJob = async () => {
    await (0, registryLoader_1.loadContractInfoFromRegistry)();
    logger.info('**DB: personalStatsJob initialised');
    node_schedule_1.default.scheduleJob(personalStatsJobSetting, async () => {
        try {
            logger.info('**DB: personalStatsJob started');
            const res = await (0, personalUtil_1.calcLoadingDateRange)();
            if (res.length > 0) {
                logger.info(`**DB: Starting personal stats load (from: ${res[0]}, to: ${res[1]})`);
                await (0, etlPersonalStats_1.etlPersonalStats)(res[0], // start date 'DD/MM/YYYY'
                res[1], // end date 'DD/MM/YYYY'
                null // address
                );
            }
            else {
                logger.info(`**DB: No personal stats load required`);
            }
            logger.info('**DB: personalStatsJob finished');
        }
        catch (err) {
            logger.error(`**DB: Error in dbStatsScheduler.js->personalStatsJob(): ${err}`);
        }
    });
};
const startDbStatsJobs = () => {
    groStatsJob();
    priceCheckJob();
    // personalStatsJob();
};
exports.startDbStatsJobs = startDbStatsJobs;
