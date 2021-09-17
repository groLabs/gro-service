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
const { getData } = require('../parser/lbpParser');
const { fetchLBPData } = require('../services/lbpService');
const {
    calcRangeTimestamps,
    findBlockByDate
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
const etlLbpStats = async () => {
    try {
        const now = moment().unix();
        if (now >= LBP_START_TIMESTAMP && now <= LBP_END_TIMESTAMP) {
            // Retrieve price & current supply from Balancer
            const stats = await fetchLBPData(null);
            if (isFormatOK(stats)) {
                // Parse data into SQL parameter
                const data = getData(stats);
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
            let msg = `**DB: LBP - current date (${now}) is out of the LBP period (start: `;
            msg += `${LBP_START_TIMESTAMP} end: ${LBP_END_TIMESTAMP}) - no data load needed`;
            logger.info(msg);
        }
    } catch (err) {
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStats(): ${err}`);
    }
}

// Historical data reload
// 1) Deletes any data from table LBP_BALANCER_V1 within the timestamp range
// 2) Loads data every N intervals
// @dev: HDL does not generate intermediate JSON files, but only latest file is latest=true
const etlLbpStatsHDL = async (start, end, interval, latest) => {
    try {
        // Safety check
        if (start > end) {
            logger.error(`**DB: Error in etlLbpStats.js->etlLbpStatsHDL(): start date can't be greater than end date`);
            return false;
        }

        // Get all dates in N intervals for a given time range (start, end)
        const dates = calcRangeTimestamps(start, end, interval);

        // Remove records from DB for the given time range
        logger.error(`**DB: LBP - starting data load from ${start} to ${end} for ${dates.length} interval/s...`);
        const res = await removeLbp(start, end);
        if (res) {
            // Get block number for each date
            for (const date of dates) {
                // Retrieve price & current supply from Balancer
                const block = (await findBlockByDate(date, true)).block;
                const stats = await fetchLBPData(block);
                if (isFormatOK(stats)) {
                    // Parse data into SQL parameter
                    const data = getData(stats);
                    if (isLengthOK(data)) {
                        // Load data into LBP_BALANCER_V1
                        const res = await loadLbp(data);
                        if (!res)
                            return;
                    }
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
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStatsHDL(): ${err}`);
        return false;
    }
}

// If bot crashed and restarts, check amount of intervals lost and
// backfill data before triggering the cron
const etlRecovery = async () => {
    try {
        const isFile = fileExists(`${statsDir}/lbp-latest.json`);
        if (isFile) {
            let rawdata = fs.readFileSync(`${statsDir}/lbp-latest.json`);
            let data = JSON.parse(rawdata);
            if (isCurrentTimestampOK(data)) {
                const lbp_current_timestamp = parseFloat(data.lbp_stats.current_timestamp);
                const now = moment().unix();
                if (now >= LBP_START_TIMESTAMP) {
                    if (now - lbp_current_timestamp > INTERVAL && lbp_current_timestamp < LBP_END_TIMESTAMP) {
                        // Last load > INTERVAL minutes ago -> recovery needed
                        logger.info(`**DB: LBP - backfill needed: last load was ${(now - lbp_current_timestamp) / 60 | 0} minutes ago.`);
                        const res = await etlLbpStatsHDL(
                            lbp_current_timestamp + INTERVAL,   // start
                            (now > LBP_END_TIMESTAMP)
                                ? LBP_END_TIMESTAMP
                                : now,                          // end (if now is later than LBP end date, calc until LBP end date)
                            INTERVAL,                           // interval
                            true,                               // last file
                        );
                        // Re-check if any load is still required after the backfilling
                        if (res) {
                            await etlRecovery();
                        } else {
                            return false;
                        }
                        return true;
                    } else {
                        if (lbp_current_timestamp >= LBP_END_TIMESTAMP) {
                            // LBP completed, data up-to-date -> no recovery needed
                            logger.info(`**DB: LBP - no backfill needed. LBP already finished and data up-to-date.`);
                        } else {
                            // Last load less than INTERVAL minutes ago -> no recovery needed
                            logger.info(`**DB: LBP - no backfill needed: last load was ${(now - lbp_current_timestamp) / 60 | 0} minute/s ago.`);
                        }
                        return true;
                    }
                } else {
                    // LBP not started yet, no recovery needed
                    logger.info(`**DB: LBP - no backfill needed: LBP not started yet`);
                    return true;
                }
            } else {
                // Wrong JSON format
                logger.error(`**DB: Error in etlLbpStats.js->etlRecovery(): Wrong JSON format -> ${JSON.stringify(data)}`);
                return false;
            }
        } else {
            logger.error(`**DB: Error in etlLbpStats.js->etlRecovery(): File <${statsDir}/lbp-latest.json> is missing`);
            return false;
        }
    } catch (err) {
        logger.error(`**DB: Error in etlLbpStats.js->etlRecovery(): ${err}`);
        return false;
    }
}

module.exports = {
    etlLbpStats,
    etlLbpStatsHDL,
    etlRecovery,
};