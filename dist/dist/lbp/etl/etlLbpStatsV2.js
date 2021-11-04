"use strict";
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { loadLbp, removeLbp, } = require('../loader/loadLbp');
const { getDataV2 } = require('../parser/lbpParserV2');
const { fetchLBPDataV2 } = require('../services/lbpServiceV2');
const { callSubgraph } = require('../common/apiCaller');
const { calcRangeTimestamps, } = require('../../database/common/globalUtil');
const { isFormatOK, isLengthOK, isCurrentTimestampOK, generateJSONFile, fileExists } = require('../common/lbpUtil');
const { getLbpStatsDB } = require('../handler/lbpHandler');
const { INTERVAL } = require('../constants');
// Config
const statsDir = getConfig('stats_folder');
const LBP_START_TIMESTAMP = getConfig('lbp.lbp_start_date');
const LBP_END_TIMESTAMP = getConfig('lbp.lbp_end_date');
/// @notice Normal loading process (without trading volume)
/// @dev    Price spot & Gro balance are retrieved from Balancer subgraph every 5'
///         only during the LBP period
const etlLbpStatsV2 = async () => {
    try {
        const now = moment().unix();
        if (now >= LBP_START_TIMESTAMP && now <= LBP_END_TIMESTAMP) {
            // Retrieve price & current supply from Balancer
            const stats = await fetchLBPDataV2(now, null);
            if (!stats.message)
                if (isFormatOK(stats)) {
                    // Parse data into SQL parameter
                    const data = getDataV2(stats);
                    if (isLengthOK(data)) {
                        // Load data into LBP_BALANCER_V1
                        const res = await loadLbp(data);
                        if (res) {
                            // Generate JSON file
                            const allData = await getLbpStatsDB();
                            generateJSONFile(allData, // JSON data
                            true, // latest file
                            false // HDL
                            );
                        }
                    }
                }
        }
        else {
            let msg = `**LBP: No data load needed - Current date (${now}) is out of LBP period `;
            msg += `(from: ${LBP_START_TIMESTAMP} to: ${LBP_END_TIMESTAMP})`;
            logger.info(msg);
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStats(): ${err}`);
    }
};
/// @notice Normal loading process (with trading volume)
/// @dev    Price spot, Gro balance & trading volume are retrieved from Balancer subgraph every 5'
///         only during the LBP period
const etlLbpStatsV2_vol = async () => {
    try {
        const now = moment().unix();
        if (now >= LBP_START_TIMESTAMP && now <= LBP_END_TIMESTAMP) {
            const swaps = await getSwaps(now, // end timestamp
            0, // skip (calculated recursively)
            [] // result (calculated recursively)
            );
            // If error during subgraph call
            if (!swaps)
                return false;
            const stats = await fetchLBPDataV2(now, swaps);
            if (!stats.message) {
                if (isFormatOK(stats)) {
                    // Parse data into SQL parameter
                    const data = getDataV2(stats);
                    if (isLengthOK(data)) {
                        // Load data into LBP_BALANCER_V1
                        const res = await loadLbp(data);
                        if (res) {
                            // Generate JSON file
                            const allData = await getLbpStatsDB();
                            generateJSONFile(allData, // JSON data
                            true, // latest file
                            false // HDL
                            );
                        }
                    }
                }
            }
            else {
                return false;
            }
        }
        else {
            let msg = `**LBP: No data load needed - Current date (${now}) is out of LBP period `;
            msg += `(from: ${LBP_START_TIMESTAMP} to: ${LBP_END_TIMESTAMP})`;
            logger.info(msg);
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStatsV2_vol(): ${err}`);
    }
};
/// @notice Retrieve swaps from Balancer subgraph
/// @dev    - Amount of records returned via subgraph API is limited to 1K, so 
///         recursive calls per 1K records each are done to retrieve all data
///         - The recurvise calls will stop once the latest iteration returns
///         an amount of records < 1K
/// @param  end The end timestamp to retrieve data
/// @param  skip The offset to start retrieving data from (e.g: 0 for the 1st call,
///         1k for the 2nd call, 2k for the 3rd call...)
/// @param  result The array that stores all swap values
/// @return An array with all swaps
const getSwaps = async (end, skip, result) => {
    try {
        const swaps = await callSubgraph('swaps', end, 1000, skip);
        if (swaps) {
            result = result.concat(swaps.swaps);
            return (swaps.swaps.length < 1000)
                ? result
                : getSwaps(end, skip + 1000, result);
        }
        else {
            throw 'Error during subgraph API call';
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->getSwaps(): ${err}`);
    }
};
/// @notice Historical loading process
///         1) Deletes any data from table LBP_BALANCER_HOST* within the timestamp range
///         2) Loads data every N intervals from start to end dates
/// @dev    - Gro balance is calculated based on the sum of all swaps until end date
///         for every N interval iteration
///         - Price spot is calculated based on weights until end date on every N 
///         interval iteration
///         - An HDL will never generate intermediate json files, but only the latest 
///         file <lbp-latest.json> if parameter 'latest' is true
/// @param  start The start timestamp to load historical data
/// @param  end The end timestamp to load historical data
/// @param  interval The interval timestamp to load historical data (e.g.: every 5 minutes)
/// @param  latest Updates file <lbp-latest.json> if true; does not update otherwise
/// @return True if no exceptions found, false otherwise
const etlLbpStatsHDLV2 = async (start, end, interval, latest) => {
    try {
        // Safety check
        if (start > end) {
            const msg = `start date ${start} can't be greater than end date ${end}`;
            logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStatsHDLV2(): ${msg}`);
            return false;
        }
        // Get all dates in N intervals for a given time range (start, end)
        const dates = calcRangeTimestamps(start, end, interval);
        // Remove records from DB for the given time range
        logger.info(`**LBP: LBP - starting data load from ${start} to ${end} for ${dates.length} interval/s...`);
        const res = await removeLbp(start, end);
        // Retrieve all swaps
        if (res) {
            const swaps = await getSwaps(end, // end timestamp
            0, // skip (calculated recursively)
            [] // result (calculated recursively)
            );
            // If error during subgraph call
            if (!swaps)
                return false;
            // For each date, Retrieve price and balace up to that given date
            for (const date of dates) {
                const stats = await fetchLBPDataV2(moment(date).unix(), swaps);
                if (!stats.message) {
                    if (isFormatOK(stats)) {
                        // Parse data into SQL parameter
                        const data = getDataV2(stats);
                        if (isLengthOK(data)) {
                            // Load data into LBP_BALANCER_V1
                            const res = await loadLbp(data);
                            if (!res)
                                return false;
                        }
                    }
                }
                else {
                    return false;
                }
            }
        }
        if (latest) {
            const allData = await getLbpStatsDB();
            generateJSONFile(allData, // JSON data
            latest, // latest file
            true // HDL
            );
        }
        return true;
    }
    catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStatsHDLV2(): ${err}`);
        return false;
    }
};
/// @notice Recovery process
///         If the bot is interrupted, the recovery process will be called first thing
///         once the bot re-starts, checking amount of intervals to be backfilled with
///         missing data before it triggers the normal loading process again
/// @dev    - No recovery if LBP hasn' t started
//          - No recovery if last update >= LBP end date
//          - No recovery if last update < 5' (within LBP period)
/// @return True if no exceptions found, false otherwise
const etlRecoveryV2 = async () => {
    try {
        const isFile = fileExists(`${statsDir}/lbp-latest.json`);
        if (isFile) {
            let rawdata = fs.readFileSync(`${statsDir}/lbp-latest.json`);
            let data = JSON.parse(rawdata);
            if (isCurrentTimestampOK(data)) {
                const now = moment().unix();
                if (now >= LBP_START_TIMESTAMP) {
                    const lbp_latest_timestamp = parseFloat(data.lbp_stats.current_timestamp);
                    if (now - lbp_latest_timestamp >= INTERVAL && lbp_latest_timestamp < LBP_END_TIMESTAMP) {
                        // Last load >=5' ago and now still within the LBP -> recovery needed
                        logger.info(`**LBP: LBP - backfill needed: last load was ${(now - lbp_latest_timestamp) / 60 | 0} minutes ago.`);
                        const res = await etlLbpStatsHDLV2(lbp_latest_timestamp + INTERVAL, // start
                        (now > LBP_END_TIMESTAMP)
                            ? LBP_END_TIMESTAMP
                            : now, // end (if now is later than LBP end date, calc until LBP end date)
                        INTERVAL, // interval
                        true);
                        if (res) {
                            // Re-check if any load is still required after the backfilling
                            return await etlRecoveryV2();
                        }
                        else {
                            // Errors during HDL
                            return false;
                        }
                    }
                    else {
                        if (lbp_latest_timestamp >= LBP_END_TIMESTAMP) {
                            // LBP completed, data up-to-date -> no recovery needed
                            logger.info(`**LBP: No backfill needed: LBP already finished and data up-to-date.`);
                        }
                        else {
                            // Last load less than INTERVAL minutes ago -> no recovery needed
                            logger.info(`**LBP: No backfill needed: last load was ${(now - lbp_latest_timestamp) / 60 | 0} minute/s ago.`);
                        }
                        return true;
                    }
                }
                else {
                    // LBP not started yet, no recovery needed
                    logger.info(`**LBP: No backfill needed: LBP not started yet`);
                    return true;
                }
            }
            else {
                // Wrong JSON format
                logger.error(`**LBP: Error in etlLbpStatsV2.js->etlRecoveryV2(): Wrong JSON format -> ${JSON.stringify(data)}`);
                return false;
            }
        }
        else {
            logger.error(`**LBP: Error in etlLbpStatsV2.js->etlRecoveryV2(): File <${statsDir}/lbp-latest.json> is missing`);
            return false;
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->etlRecoveryV2(): ${err}`);
        return false;
    }
};
module.exports = {
    etlLbpStatsV2,
    etlLbpStatsV2_vol,
    etlLbpStatsHDLV2,
    etlRecoveryV2,
    getSwaps,
};
