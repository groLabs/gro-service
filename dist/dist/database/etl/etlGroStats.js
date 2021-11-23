"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.etlGroStatsHDL = exports.etlGroStats = void 0;
const apiCaller_1 = require("../common/apiCaller");
const configUtil_1 = require("../../common/configUtil");
const loadGroStats_1 = require("../loader/loadGroStats");
const protocolUtil_1 = require("../common/protocolUtil");
const globalUtil_1 = require("../common/globalUtil");
const globalUtil_2 = require("../common/globalUtil");
const constants_1 = require("../constants");
const route = (0, configUtil_1.getConfig)('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
let options = {
    hostname: route.gro_stats.hostname,
    port: route.gro_stats.port,
    path: '',
    method: 'GET',
};
const etlGroStats = async () => {
    try {
        let lastTimestamp;
        options.path = route.gro_stats.path;
        const res = await (0, protocolUtil_1.checkLastTimestamp)('GRO_STATS');
        if (res.status === constants_1.QUERY_SUCCESS) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const call = await (0, apiCaller_1.apiCaller)(options);
                if (call.status === constants_1.QUERY_SUCCESS) {
                    const stats = JSON.parse(call.data);
                    if (stats.gro_stats && 'current_timestamp' in stats.gro_stats) {
                        const currentTimestamp = parseInt(stats.gro_stats.current_timestamp);
                        if (currentTimestamp > lastTimestamp)
                            await (0, loadGroStats_1.loadAllTables)(stats.gro_stats);
                    }
                    else {
                        logger.error('**DB: No timestamp found in JSON API call');
                    }
                }
                else {
                    logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
                }
            }
            else {
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOADS');
            }
        }
    }
    catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
};
exports.etlGroStats = etlGroStats;
// This will be called on-demand, not by a cron
const etlGroStatsHDL = async (start, end, kpi, interval) => {
    try {
        const intervals = (0, globalUtil_1.calcRangeTimestamps)(start, end, interval);
        logger.info(`**DB: Starting HDL for ${kpi} on timestamps ${start} to ${end}`);
        for (const currentTimestamp of intervals) {
            // @ts-ignore
            const block = (await (0, globalUtil_2.findBlockByDate)(currentTimestamp, true)).block;
            options.path = route.historical_gro_stats.path + `?network=${nodeEnv}&block=${block}&attr=${kpi}`;
            const call = await (0, apiCaller_1.apiCaller)(options);
            if (call.status === constants_1.QUERY_SUCCESS) {
                const stats = JSON.parse(call.data);
                if (stats.historical_gro_stats) {
                    const res = await (0, loadGroStats_1.loadAPY)(stats.historical_gro_stats);
                    if (!res)
                        return;
                }
                else {
                    logger.error('**DB: No data found in JSON API call');
                }
            }
            else {
                logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
            }
        }
        logger.info(`**DB: Finished HDL for ${kpi} on timestamps ${start} to ${end}`);
    }
    catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStatsHDL(): ${err}`);
    }
};
exports.etlGroStatsHDL = etlGroStatsHDL;
