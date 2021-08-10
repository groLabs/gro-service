const { query } = require('../handler/queryHandler');
const { apiCaller } = require('../common/apiCaller');
const { getConfig } = require('../../common/configUtil');
const route = getConfig('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { loadAllTables } = require('../loader/loadGroStats');
const { checkLastTimestamp } = require('../common/protocolUtil');
const { calcRangeTimestamps } = require('../common/calcRangeTimestamps');
const { QUERY_SUCCESS } = require('../constants');

const FIVE_MINITUES = 1800;

const options = {
    hostname: route.gro_stats.hostname,
    port: route.gro_stats.port,
    path: route.gro_stats.path,
    method: 'GET',
};

const etlGroStats = async () => {
    try {
        let lastTimestamp;
        const res = await checkLastTimestamp('GRO_STATS');
        if (res.status === QUERY_SUCCESS) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const call = await apiCaller(options);
                if (call.status === QUERY_SUCCESS) {
                    const stats = JSON.parse(call.data);
                    if (stats.gro_stats && 'current_timestamp' in stats.gro_stats) {
                        const currentTimestamp = parseInt(stats.gro_stats.current_timestamp);
                        if (currentTimestamp > lastTimestamp)
                            await loadAllTables(stats.gro_stats);
                    } else {
                        logger.error('**DB: No timestamp found in JSON API call');
                    }
                } else {
                    logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
                }
            } else {
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOADS');
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
}

const loadApyHDL = async (intervals, kpi) => {
    try {
        //TBC
        // const result = [
        //     stats.current_timestamp,
        //     moment.unix(stats.current_timestamp).utc(),
        //     getNetworkId(),
        //     getProductId(product),
        //     0, //stats.apy.last24h[product],
        //     kpi, //stats.apy.last7d[product],
        //     0, //stats.apy.daily[product],
        //     0, //stats.apy.weekly[product],
        //     0, //stats.apy.monthly[product],
        //     0, //stats.apy.all_time[product],
        //     0, //stats.apy.current[product],
        //     moment().utc(),
        // ]
        // console.log(result);
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->loadApyHDL(): ${err}`);
    } 
}

const etlGroStatsHDL = async (start, end, kpi) => {
    try {
        const intervals = calcRangeTimestamps(start, end, FIVE_MINITUES);
        logger.info(`**DB: Starting HDL for ${kpi} on timestamps ${start} to ${end}`);
        // if (kpi === 'last7d')
        await loadApyHDL(intervals, kpi);
        logger.info(`**DB: Finished HDL for ${kpi} on timestamps ${start} to ${end}`);
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStatsHDL(): ${err}`);
    }
}

module.exports = {
    etlGroStats,
    etlGroStatsHDL,
}
