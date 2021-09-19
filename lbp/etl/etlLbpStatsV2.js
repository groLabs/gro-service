const fs = require('fs');
const path = require('path');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const {
    loadLbp,
    removeLbp,
} = require('../loader/loadLbp');
const { getDataV2 } = require('../parser/lbpParserV2');
const { fetchLBPDataV2 } = require('../services/lbpServiceV2');
const { callSubgraph } = require('../common/apiCaller');
const {
    calcRangeTimestamps,
    // findBlockByDate
} = require('../../database/common/globalUtil');
const {
    isFormatOK,
    isLengthOK,
    isCurrentTimestampOK,
    generateJSONFile,
    fileExists
} = require('../common/lbpUtil');
const { getLbpStatsDB } = require('../handler/lbpHandler');
const { INTERVAL } = require('../constants');

// Config
const statsDir = getConfig('stats_folder');
const LBP_START_TIMESTAMP = getConfig('lbp.lbp_start_date');
const LBP_END_TIMESTAMP = getConfig('lbp.lbp_end_date');


// Normal load
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
                            generateJSONFile(
                                allData,    // JSON data
                                true,       // latest file
                                false       // HDL
                            );
                        }
                    }
                }
        } else {
            let msg = `**LBP: LBP - current date (${now}) is out of the LBP period (start: `;
            msg += `${LBP_START_TIMESTAMP} end: ${LBP_END_TIMESTAMP}) - no data load needed`;
            logger.info(msg);
        }
    } catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStats(): ${err}`);
    }
}

// Multiple records from subgraphs need to be retrieved through pagination
const getSwaps = async (end, skip, result) => {
    try {
        const swaps = await callSubgraph('swaps', end, 1000, skip);
        if (swaps) {
            result = result.concat(swaps.swaps);
            return (swaps.swaps.length < 1000)
                ? result
                : getSwaps(end, skip + 1000, result);
        } else {
            throw 'Error during subgraph API call';
        }
    } catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->getSwaps(): ${err}`);
    }
}

// Historical load
// 1) Deletes any data from table LBP_BALANCER_V1 within the timestamp range
// 2) Loads data every N intervals
// @dev: HDL does not generate intermediate JSON files, but only latest file is latest=true
const etlLbpStatsHDLV2 = async (start, end, interval, latest) => {
    try {
        // Safety check
        if (start > end) {
            logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStatsHDLV2(): start date can't be greater than end date`);
            return false;
        }

        // Get all dates in N intervals for a given time range (start, end)
        const dates = calcRangeTimestamps(start, end, interval);

        // Remove records from DB for the given time range
        logger.info(`**LBP: LBP - starting data load from ${start} to ${end} for ${dates.length} interval/s...`);
        const res = await removeLbp(start, end);

        // Retrieve all swaps
        if (res) {
            const swaps = await getSwaps(
                end,    // end timestamp
                0,      // skip (calculated recursively)
                []      // result (calculated recursively)
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
                } else {
                    return false;
                }
            }
        }

        if (latest) {
            const allData = await getLbpStatsDB();
            generateJSONFile(
                allData,    // JSON data
                latest,     // latest file
                true        // HDL
            );
        }
        return true;
    } catch (err) {
        logger.error(`**LBP: Error in etlLbpStatsV2.js->etlLbpStatsHDLV2(): ${err}`);
        return false;
    }
}

// If bot crashed and restarts, check amount of intervals lost and
// backfill data before triggering the cron
const etlRecoveryV2 = async () => {
    try {
        const isFile = fileExists(`${statsDir}/lbp-latest.json`);
        if (isFile) {
            let rawdata = fs.readFileSync(`${statsDir}/lbp-latest.json`);
            let data = JSON.parse(rawdata);
            if (isCurrentTimestampOK(data)) {
                const lbp_current_timestamp = parseFloat(data.lbp_stats.current_timestamp);
                const now = moment().unix();
                if (now >= LBP_START_TIMESTAMP) {
                    if (now - lbp_current_timestamp >= INTERVAL && lbp_current_timestamp <= LBP_END_TIMESTAMP) {
                        // Last load > INTERVAL minutes ago -> recovery needed
                        logger.info(`**LBP: LBP - backfill needed: last load was ${(now - lbp_current_timestamp) / 60 | 0} minutes ago.`);
                        const res = await etlLbpStatsHDLV2(
                            lbp_current_timestamp + INTERVAL,   // start
                            (now > LBP_END_TIMESTAMP)
                                ? LBP_END_TIMESTAMP
                                : now,                          // end (if now is later than LBP end date, calc until LBP end date)
                            INTERVAL,                           // interval
                            true,                               // last file
                        );
                        
                        if (res) {
                            // Re-check if any load is still required after the backfilling
                            return await etlRecoveryV2();
                        } else {
                            // Errors during HDL
                            return false;
                        }
                    } else {
                        if (lbp_current_timestamp > LBP_END_TIMESTAMP) {
                            // LBP completed, data up-to-date -> no recovery needed
                            logger.info(`**LBP: LBP - no backfill needed. LBP already finished and data up-to-date.`);
                        } else {
                            // Last load less than INTERVAL minutes ago -> no recovery needed
                            logger.info(`**LBP: LBP - no backfill needed: last load was ${(now - lbp_current_timestamp) / 60 | 0} minute/s ago.`);
                        }
                        return true;
                    }
                } else {
                    // LBP not started yet, no recovery needed
                    logger.info(`**LBP: LBP - no backfill needed: LBP not started yet`);
                    return true;
                }
            } else {
                // Wrong JSON format
                logger.error(`**LBP: Error in etlLbpStats.js->etlRecovery(): Wrong JSON format -> ${JSON.stringify(data)}`);
                return false;
            }
        } else {
            logger.error(`**LBP: Error in etlLbpStats.js->etlRecovery(): File <${statsDir}/lbp-latest.json> is missing`);
            return false;
        }
    } catch (err) {
        logger.error(`**LBP: Error in etlLbpStats.js->etlRecovery(): ${err}`);
        return false;
    }
}

module.exports = {
    etlLbpStatsV2,
    etlLbpStatsHDLV2,
    etlRecoveryV2,
};