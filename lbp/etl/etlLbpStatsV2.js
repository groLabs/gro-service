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
const { fetchLBPDataV2 } = require('../services/lbpServiceV2');
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
const etlLbpStatsV2 = async () => {
    try {
        // const now = moment().unix();
        // if (now >= LBP_START_TIMESTAMP && now <= LBP_END_TIMESTAMP) {
        //     // Retrieve price & current supply from Balancer
        //     const stats = await fetchLBPData(null);
        //     if (isFormatOK(stats)) {
        //         // Parse data into SQL parameter
        //         const data = getData(stats);
        //         if (isLengthOK(data)) {
        //             // Load data into LBP_BALANCER_V1
        //             const res = await loadLbp(data);
        //             if (res) {
        //                 // Generate JSON file
        //                 const allData = await getLbpStatsDB();
        //                 generateJSONFile(
        //                     allData,    // JSON data
        //                     true,       // latest file
        //                     false       // HDL
        //                 );
        //             }
        //         }
        //     }
        // } else {
        //     let msg = `**DB: LBP - current date (${now}) is out of the LBP period (start: `;
        //     msg += `${LBP_START_TIMESTAMP} end: ${LBP_END_TIMESTAMP}) - no data load needed`;
        //     logger.info(msg);
        // }
        const stats = await fetchLBPDataV2();
        console.log('stats', stats);

    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->etlLbpStats(): ${err}`);
    }
}

module.exports = {
    etlLbpStatsV2,
};