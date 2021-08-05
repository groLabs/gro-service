const { query } = require('../handler/queryHandler');
const { apiCaller } = require('../common/apiCaller');
const { getConfig } = require('../../common/configUtil');
const moment = require('moment');
const route = getConfig('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { loadAllTables } = require('../loader/loadPriceCheck');
const { checkLastTimestamp } = require('../common/protocolUtil');
const { findBlockByDate } = require('../common/personalUtil'); //TODO: generic file, not in personalUtil
const { QUERY_SUCCESS } = require('../constants');


const DIFF_2m = 120;
const HALF_AN_HOUR = 1800 - DIFF_2m;
const HALF_AN_HOUR_EXACT = 1800;

//TODO: if calculation is in process, do not launch again this process!

const isTimestamp = (_ts) => {
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

// Calculate number of 30' intervals from the start to end dates (in case an historical data load is needed)
const calcRangeTimestamps = (start, end) => {
    try {
        let iterations = [];
        if (start === end) {
            iterations.push(moment.unix(start).utc());
            return iterations;
        }
        const search = (start, end) => {
            if (start < end) {
                iterations.push(moment.unix(start).utc());
                start = start + HALF_AN_HOUR_EXACT;
                search(start, end);
            }
            return iterations;
        }
        return search(start, end);
    } catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->calcRangeTimestamps(): ${err}`);
    }
}

const loadPriceCheck = async (intervals, isHDL) => {
    try {
        for (const currentTimestamp of intervals) {
            const block = (await findBlockByDate(currentTimestamp)).block;
            let options = {
                hostname: route.gro_stats.hostname,
                port: route.gro_stats.port,
                path: `/stats/gro_price_check?network=${nodeEnv}&block=${block}`,
                method: 'GET',
            };
            const call = await apiCaller(options);
            if (call.status === QUERY_SUCCESS) {
                const prices = JSON.parse(call.data);
                if (prices.pricing && 'block_number' in prices.pricing) {
                    logger.info(`**DB: Processing price check for block ${block} for ${currentTimestamp}`);
                    prices.pricing.current_timestamp = moment.utc(currentTimestamp).unix();
                    await loadAllTables(prices.pricing, isHDL);
                } else {
                    logger.error('**DB: No block number found in JSON API call');
                }
            } else {
                logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->loadPriceCheck(): ${err}`);
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
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOADS');
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->etlPriceCheck(): ${err}`);
    }
}

const etlPriceCheckHDL = async (start, end) => {
    try {
        if (isTimestamp([start, end])) {
            const intervals = calcRangeTimestamps(start, end);
            logger.info(`**DB: Starting HDL for Price check on timestamps ${start} to ${end}`);
            await loadPriceCheck(intervals, true);
            logger.info(`**DB: Finished HDL for Price check on timestamps ${start} to ${end}`);
        } else {
            logger.error('**DB: Wrong start or end timestamps');
        }
    } catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->etlPriceCheck(): ${err}`);
    }
}

module.exports = {
    etlPriceCheck,
    etlPriceCheckHDL,
}
