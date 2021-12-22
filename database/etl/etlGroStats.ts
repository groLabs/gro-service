import { query } from '../handler/queryHandler'; // if removed, discord error event it's not used
import { apiCaller } from '../caller/apiCaller';
import { getConfig } from '../../common/configUtil';
import { loadAllTables, loadAPY } from '../loader/loadGroStats';
import { checkLastTimestamp } from '../common/protocolUtil';
import { calcRangeTimestamps } from '../common/globalUtil';
import { findBlockByDate } from '../common/globalUtil';
import { QUERY_SUCCESS } from '../constants';
import { ICall } from '../common/commonTypes'

const route: any = getConfig('route');
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
        const res = await checkLastTimestamp('GRO_STATS');
        if (res.status === QUERY_SUCCESS) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const call: ICall = await apiCaller(options);
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

// This will be called on-demand, not by a cron
const etlGroStatsHDL = async (start, end, kpi, interval) => {
    try {
        const intervals = calcRangeTimestamps(start, end, interval);
        logger.info(`**DB: Starting HDL for ${kpi} on timestamps ${start} to ${end}`);
        for (const currentTimestamp of intervals) {
            // @ts-ignore
            const block = (await findBlockByDate(currentTimestamp, true)).block;
            options.path = route.historical_gro_stats.path + `?network=${nodeEnv}&block=${block}&attr=${kpi}`;
            const call: ICall = await apiCaller(options);
            if (call.status === QUERY_SUCCESS) {
                const stats = JSON.parse(call.data);
                if (stats.historical_gro_stats) {
                    const res = await loadAPY(stats.historical_gro_stats);
                    if (!res)
                        return;
                } else {
                    logger.error('**DB: No data found in JSON API call');
                }
            } else {
                logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
            }
        }
        logger.info(`**DB: Finished HDL for ${kpi} on timestamps ${start} to ${end}`);
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStatsHDL(): ${err}`);
    }
}

export {
    etlGroStats,
    etlGroStatsHDL,
}
