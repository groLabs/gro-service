const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
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
const { generateJSONFile } = require('../common/lbpUtil');
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
        // Retrieve price & supply from Balancer
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
                    generateJSONFile(allData);
                }
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->etlLbpStats(): ${err}`);
    }
}

// Historical data reload
// 1) Deletes any data from LBP_BALANCER_V1 within the timestamp range
// 2) Loads in 5' intervals
const etlLbpStatsHDL = async (start, end, interval) => {
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
                // Retrieve price & supply from Balancer
                const block = (await findBlockByDate(date, true)).block;
                const stats = await fetchLBPData(block);
                if (isFormatOK(stats)) {
                    // Parse data into SQL parameter
                    const data = getData(stats);
                    if (isLengthOK(data))
                        // Load data into LBP_BALANCER_V1
                        await loadLbp(data);
                }
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStatsHDL(): ${err}`);
    }
}

module.exports = {
    etlLbpStats,
    etlLbpStatsHDL,
};