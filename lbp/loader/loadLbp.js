/// Sergi to implement SQL loader call

const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { QUERY_ERROR } = require('../constants');
const { getData } = require('../parser/lbpParser');
const { loadTableUpdate } = require('../common/lbpUtil');
const { getNetworkId } = require('../common/lbpUtil');
const { fetchLBPData } = require('../services/lbpService');


const loadLbpTables = async (/*stats*/) => {
    try {
        // Retrieve price & supply from Balancer
        const stats = await fetchLBPData(null);
        console.log('stats:', stats);
        console.log('getData:',getData(stats));

        // Safety check
        if (!stats.price.timestamp || stats.price.timestamp <= 0 || !stats.balance.timestamp || stats.balance.timestamp <=0 ) {
            logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): wrong JSON format from data sourcing: ${stats}`);
        }

        // Load data into LBP_BALANCER_V1
        const res = await query('insert_lbp_balancer.sql', getData(stats));
        if (res.status === QUERY_ERROR) {
            logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): loading data into LBP_BALANCER_V1`);
        }

    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): ${err}`);
    }
}

module.exports = {
    getNetworkId,
    loadLbpTables,
}