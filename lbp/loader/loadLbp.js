const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { QUERY_ERROR } = require('../constants');


const loadLbp = async (data) => {
    try {
        // Load data into LBP_BALANCER_V1
        const res = await query('insert_lbp_balancer.sql', data);
        if (res.status === QUERY_ERROR) {
            logger.error(`**DB: Error in etlLbpStats.js->etlLbpStats(): loading data into LBP_BALANCER_V1`);
            return false;
        } else {
            logger.info(`**DB: 1 record added into LBP_BALANCER_V1 (price: ${data[4]}, balance: ${data[5]})`);
            return true;
        }
    } catch (err) {
        logger.error(`**DB: Error in etlLbpStats.js->etlLbpStats(): ${err}`);
        return false;
    }
}

module.exports = {
    loadLbp,
}