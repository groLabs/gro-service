import { apiCaller } from '../caller/apiCaller';
import { getConfig } from '../../common/configUtil';
import { loadAllTables, loadAPY } from '../loader/loadGroStatsMC';
import { checkLastTimestamp } from '../common/protocolUtil';
import { calcRangeTimestamps } from '../common/globalUtil';
import { findBlockByDate } from '../common/globalUtil';
import { QUERY_SUCCESS } from '../constants';
import { ICall } from '../interfaces/ICall';
const route: any = getConfig('route');
const nodeEnv = process.env.NODE_ENV.toLowerCase();
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import { NetworkName } from '../types';


let options = (nodeEnv === NetworkName.ROPSTEN)
    ? { // G2 testing
        hostname: route.gro_stats_g2.hostname,
        port: route.gro_stats_g2.port,
        path: '',
        method: 'GET',
    }
    : { // Standard
        hostname: route.gro_stats.hostname,
        port: route.gro_stats.port,
        path: '',
        method: 'GET',
    };

const etlGroStatsMC = async () => {
    try {
        let lastTimestamp;
        options.path = (nodeEnv === NetworkName.ROPSTEN)
            ? route.gro_stats_g2.path
            : route.gro_stats_mc.path;
        const res = await checkLastTimestamp('GRO_STATS');
        if (res.status === QUERY_SUCCESS) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const call: ICall = await apiCaller(options);
                if (call.status === QUERY_SUCCESS) {
                    const stats = JSON.parse(call.data);
                    if (stats.gro_stats_mc && 'current_timestamp' in stats.gro_stats_mc) {
                        const currentTimestamp = parseInt(stats.gro_stats_mc.current_timestamp);
                        if (currentTimestamp > lastTimestamp)
                            await loadAllTables(stats.gro_stats_mc);
                    } else {
                        showError(
                            'etlGroStatsMC.ts->etlGroStatsMC()',
                            'No timestamp found in JSON API call'
                        );
                    }
                } else {
                    showError(
                        'etlGroStatsMC.ts->etlGroStatsMC()',
                        `Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`
                    );
                }
            } else {
                showError(
                    'etlGroStatsMC.ts->etlGroStatsMC()',
                    'No timestamp found in table SYS_PROTOCOL_LOADS'
                );
            }
        }
    } catch (err) {
        showError(
            'etlGroStatsMC.ts->etlGroStatsMC()',
            `Error in etlGroStats.js->etlGroStats(): ${err}`
        );
    }
}

// TODO: CHANGE TO MULTI-CHAIN
// This will be called on-demand, not by a cron
const etlGroStatsHDL = async (
    start,
    end,
    kpi,
    interval
) => {
    try {
        const intervals = calcRangeTimestamps(start, end, interval);
        showInfo(`Starting HDL for ${kpi} on timestamps ${start} to ${end}`);
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
                    showError(
                        'etlGroStatsMC.ts->etlGroStatsHDL()',
                        'No data found in JSON API call'
                    );
                }
            } else {
                showError(
                    'etlGroStatsMC.ts->etlGroStatsHDL()',
                    `API call error code ${call.status} \n Error description: ${call.data}`
                );
            }
        }
        showInfo(`Finished HDL for ${kpi} on timestamps ${start} to ${end}`);
    } catch (err) {
        showError('etlGroStatsMC.ts->etlGroStatsHDL()', err);
    }
}

export {
    etlGroStatsMC,
    etlGroStatsHDL,
}
