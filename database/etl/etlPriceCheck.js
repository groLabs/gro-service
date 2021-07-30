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

// const statsTemp = require('./sample');
// const stats = statsTemp.sample.pricing;

const DIFF_2m = 120;
const HALF_AN_HOUR = 1800 - DIFF_2m;

//TODO: if calculation is in process, do not launch again this process!

// Calculate number of 30' intervals from the latest process data until now
// First time the price check is executed, lastTimestamp will be 1, so only one calc is enough.
const calcTimestamps = (lastTimestamp) => {
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

//TODO: replace '200' by SUCCESS in global var
const etlPriceCheck = async () => {
    try {
        let lastTimestamp;
        const res = await checkLastTimestamp('PRICE_CHECK');
        if (res.status === 200) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const intervals = calcTimestamps(lastTimestamp);  
                for (const currentTimestamp of intervals) {
                    const block = (await findBlockByDate(currentTimestamp)).block;
                    let options = {
                        hostname: route.gro_stats.hostname,
                        port: route.gro_stats.port,
                        path: `/stats/gro_price_check?network=${nodeEnv}&block=${block}`,
                        method: 'GET',
                    };
                    const call = await apiCaller(options);
                    if (call.status === 200) {
                        const prices = JSON.parse(call.data);
                        if (prices.pricing && 'block_number' in prices.pricing) {
                            logger.info(`**DB: Processing price check for block ${block}`);
                            await loadAllTables(prices.pricing);
                        } else {
                            logger.error('**DB: No block number found in JSON API call');
                        }
                    } else {
                        logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
                    }
                }
            } else {
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOAD');
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
}

module.exports = {
    etlPriceCheck,
}
