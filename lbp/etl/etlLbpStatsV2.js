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
            // const stats = await fetchLBPData(null);
            const stats = await fetchLBPDataV2(now, null);
            console.log('stats', stats);
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
            let msg = `**DB: LBP - current date (${now}) is out of the LBP period (start: `;
            msg += `${LBP_START_TIMESTAMP} end: ${LBP_END_TIMESTAMP}) - no data load needed`;
            logger.info(msg);
        }
        // const stats = await fetchLBPDataV2(targetTimestamp);
        // console.log('stats', stats);

    } catch (err) {
        logger.error(`**DB: Error in etlLbpStatsV2.js->etlLbpStats(): ${err}`);
    }
}

// Multiple records from subgraphs need to be retrieved through pagination
const getSwaps = async (end, skip, result) => {
    try {
        const swaps = await callSubgraph('swaps', end, 1000, skip);
        result = result.concat(swaps.swaps);
        return (swaps.swaps.length < 1000)
            ? result
            : getSwaps(end, skip + 1000, result);
    } catch (err) {
        console.log(err);
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
            logger.error(`**DB: Error in etlLbpStatsV2.js->etlLbpStatsHDLV2(): start date can't be greater than end date`);
            return false;
        }

        // Get all dates in N intervals for a given time range (start, end)
        const dates = calcRangeTimestamps(start, end, interval);

        // Remove records from DB for the given time range
        logger.error(`**DB: LBP - starting data load from ${start} to ${end} for ${dates.length} interval/s...`);
        const res = await removeLbp(start, end);

        // Retrieve all swaps
        if (res) {
            const swaps = await getSwaps(
                end,    // end timestamp
                0,      // skip (calculated recursively)
                []      // result (calculated recursively)
            );

            // For each date, Retrieve price and balace up to that given date
            for (const date of dates) {
                const stats = await fetchLBPDataV2(moment(date).unix(), swaps);
                if (isFormatOK(stats)) {
                    // Parse data into SQL parameter
                    const data = getDataV2(stats);
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
        logger.error(`**DB: Error in etlLbpStatsV2.js->etlLbpStatsHDLV2(): ${err}`);
        return false;
    }
}

module.exports = {
    etlLbpStatsV2,
    etlLbpStatsHDLV2,
};