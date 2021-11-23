"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.etlPriceCheckHDL = exports.etlPriceCheck = void 0;
const apiCaller_1 = require("../common/apiCaller");
const configUtil_1 = require("../../common/configUtil");
const moment_1 = __importDefault(require("moment"));
const loadPriceCheck_1 = require("../loader/loadPriceCheck");
const protocolUtil_1 = require("../common/protocolUtil");
const globalUtil_1 = require("../common/globalUtil");
const globalUtil_2 = require("../common/globalUtil");
const constants_1 = require("../constants");
const route = (0, configUtil_1.getConfig)('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
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
};
// Calculate number of 30' intervals from the latest process data until now
// First time the price check is executed, lastTimestamp will be 1, so only one calc is enough.
const calcLastTimestamps = (lastTimestamp) => {
    const now = (0, moment_1.default)().unix();
    let newTimestamp;
    let iterations = [];
    const search = (lastTimestamp, now) => {
        newTimestamp = lastTimestamp + HALF_AN_HOUR;
        if (newTimestamp < now) {
            iterations.push(moment_1.default.unix(newTimestamp).utc());
            lastTimestamp = newTimestamp;
            search(lastTimestamp, now);
        }
        return iterations;
    };
    if (lastTimestamp > 1) {
        return search(lastTimestamp, now);
    }
    else {
        iterations.push(moment_1.default.unix(now).utc());
        return iterations;
    }
};
const loadPriceCheck = async (intervals, isHDL) => {
    try {
        for (const currentTimestamp of intervals) {
            // @ts-ignore
            const block = (await (0, globalUtil_2.findBlockByDate)(currentTimestamp, true)).block;
            let options = {
                hostname: route.gro_stats.hostname,
                port: route.gro_stats.port,
                path: `/stats/gro_price_check?network=${nodeEnv}&block=${block}`,
                method: 'GET',
            };
            const call = await (0, apiCaller_1.apiCaller)(options);
            if (call.status === constants_1.QUERY_SUCCESS) {
                const prices = JSON.parse(call.data);
                if (prices.pricing && 'block_number' in prices.pricing) {
                    logger.info(`**DB: Processing price check for block ${block} for ${currentTimestamp}`);
                    prices.pricing.current_timestamp = moment_1.default.utc(currentTimestamp).unix();
                    await (0, loadPriceCheck_1.loadAllTables)(prices.pricing, isHDL);
                }
                else {
                    logger.error('**DB: No block number found in JSON API call');
                }
            }
            else {
                logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
            }
        }
    }
    catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->loadPriceCheck(): ${err}`);
    }
};
const etlPriceCheck = async () => {
    try {
        const res = await (0, protocolUtil_1.checkLastTimestamp)('PRICE_CHECK');
        if (res.status === constants_1.QUERY_SUCCESS) {
            const lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const intervals = calcLastTimestamps(lastTimestamp);
                await loadPriceCheck(intervals, false);
            }
            else {
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOADS');
            }
        }
    }
    catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->etlPriceCheck(): ${err}`);
    }
};
exports.etlPriceCheck = etlPriceCheck;
const etlPriceCheckHDL = async (start, end) => {
    try {
        if (isTimestamp([start, end])) {
            const intervals = (0, globalUtil_1.calcRangeTimestamps)(start, end, HALF_AN_HOUR_EXACT);
            logger.info(`**DB: Starting HDL for Price check on timestamps ${start} to ${end}`);
            await loadPriceCheck(intervals, true);
            logger.info(`**DB: Finished HDL for Price check on timestamps ${start} to ${end}`);
        }
        else {
            logger.error('**DB: Wrong start or end timestamps');
        }
    }
    catch (err) {
        logger.error(`**DB: Error in etlPriceCheck.js->etlPriceCheck(): ${err}`);
    }
};
exports.etlPriceCheckHDL = etlPriceCheckHDL;
