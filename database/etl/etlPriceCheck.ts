import moment from 'moment';
import { apiCaller } from '../caller/apiCaller';
import { getConfig } from '../../common/configUtil';
import { loadAllTables } from '../loader/loadPriceCheck';
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


const DIFF_2m = 120;
const HALF_AN_HOUR = 1800 - DIFF_2m;
const HALF_AN_HOUR_EXACT = 1800;

//TODO: if calculation is in process, do not launch again this process!

const isTimestamp = (_ts): boolean => {
    const regexp = /^\d{10}$/;
    for (const ts of _ts) {
        if (!regexp.test(ts)) {
            return false;
        }
    }
    return true;
}

// Calculate number of 30' intervals from the latest process data until now
// First time the price check is executed, lastTimestamp will be 1, so only one calc is enough.
const calcLastTimestamps = (lastTimestamp) => {
    const now = moment().unix();
    let newTimestamp;
    let iterations = [];
    const search = (lastTimestamp, now) => {
        newTimestamp = lastTimestamp + HALF_AN_HOUR;
        if (newTimestamp < now) {
            iterations.push(moment.unix(newTimestamp).utc());
            lastTimestamp = newTimestamp;
            search(lastTimestamp, now);
        }
        return iterations;
    }
    if (lastTimestamp > 1) {
        return search(lastTimestamp, now);
    } else {
        iterations.push(moment.unix(now).utc());
        return iterations;
    }
}

const loadPriceCheck = async (intervals, isHDL) => {
    try {
        for (const currentTimestamp of intervals) {
            const block = (await findBlockByDate(currentTimestamp, true)).block;
            let options = {
                hostname: route.gro_stats.hostname,
                port: route.gro_stats.port,
                path: `/stats/gro_price_check?network=${nodeEnv}&block=${block}`,
                method: 'GET',
            };
            const call: ICall = await apiCaller(options);
            if (call.status === QUERY_SUCCESS) {
                const prices = JSON.parse(call.data);
                if (prices.pricing && 'block_number' in prices.pricing) {
                    showInfo(`Processing price check for block ${block} for ${currentTimestamp}`);
                    prices.pricing.current_timestamp = moment.utc(currentTimestamp).unix();
                    await loadAllTables(prices.pricing, isHDL);
                } else {
                    showError(
                        'etlPriceCheck.ts->loadPriceCheck()',
                        'No block number found in JSON API call'
                    );
                }
            } else {
                showError(
                    'etlPriceCheck.ts->loadPriceCheck()',
                    `Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`
                );
            }
        }
    } catch (err) {
        showError('etlPriceCheck.ts->loadPriceCheck()', err);
    }
}

const etlPriceCheck = async () => {
    try {
        const res = await checkLastTimestamp('PRICE_CHECK');
        if (res.status === QUERY_SUCCESS) {
            const lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const intervals = calcLastTimestamps(lastTimestamp);
                await loadPriceCheck(intervals, false);
            } else {
                showError(
                    'etlPriceCheck.ts->etlPriceCheck()',
                    'No timestamp found in table SYS_PROTOCOL_LOADS'
                );
            }
        }
    } catch (err) {
        showError('etlPriceCheck.ts->etlPriceCheck()', err);
    }
}

const etlPriceCheckHDL = async (start, end) => {
    try {
        if (isTimestamp([start, end])) {
            const intervals = calcRangeTimestamps(start, end, HALF_AN_HOUR_EXACT);
            showInfo(`Starting HDL for Price check on timestamps ${start} to ${end}`);
            await loadPriceCheck(intervals, true);
            showInfo(`Finished HDL for Price check on timestamps ${start} to ${end}`);
        } else {
            showError(
                'etlPriceCheck.ts->etlPriceCheckHDL()',
                'Wrong start or end timestamps'
            );
        }
    } catch (err) {
        showError('etlPriceCheck.ts->etlPriceCheckHDL()', err);
    }
}

export {
    etlPriceCheck,
    etlPriceCheckHDL,
}
