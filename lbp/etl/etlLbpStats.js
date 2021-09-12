const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const statsDir = getConfig('stats_folder');
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
    generateJSONFile,
    fileExists
} = require('../common/lbpUtil');
const { getLbpStatsDB } = require('../handler/lbpHandler');


const isFormatOK = (stats) => {
    // Check timestamp JSON fields
    if (!stats.price.timestamp
        || stats.price.timestamp <= 0
        || !stats.balance.timestamp
        || stats.balance.timestamp <= 0
    ) {
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStats(): wrong JSON format from data sourcing: ${stats}`);
        throw 'Data not loaded into LBP_BALANCER_V1';
    } else {
        return true;
    }
}

const isLengthOK = (data) => {
    if (data && data.length === 7) {
        return true;
    } else {
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStats(): wrong number of values after JSON parsing: ${data}`);
        return false;
    }
}

// Normal load
const etlLbpStats = async () => {
    try {
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
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->etlLbpStats(): ${err}`);
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
            throw 'Data not loaded into LBP_BALANCER_V1';
        }

        // Get all dates in N intervals for a given time range (start, end)
        const dates = calcRangeTimestamps(start, end, interval);

        // Remove records from DB for the given time range
        const res = await removeLbp(start, end);
        if (res) {
            // Get block number for each date
            for (const date of dates) {
                console.log(date)
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
    } catch (err) {
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStatsHDL(): ${err}`);
    }
}

// If bot crashed and restarts, check amount of intervals lost and
// load data before triggering the cron
const etlRecovery = async () => {
    try {
        const isFile = fileExists(`${statsDir}/lbp-latest.json`);
        if (isFile) {
            const data = require(`../../../stats/lbp-latest.json`);
        }
    } catch (err) {
        logger.error(`**DB: Error in etlLbpStats.js->etlRecovery(): ${err}`);

    }
}

module.exports = {
    etlLbpStats,
    etlLbpStatsHDL,
    etlRecovery,
};