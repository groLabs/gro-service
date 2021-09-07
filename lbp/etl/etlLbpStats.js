// const botEnv = process.env.BOT_ENV.toLowerCase();
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
// const { query } = require('../handler/queryHandler');
// const { QUERY_ERROR } = require('../constants');
const { loadLbp } = require('../loader/loadLbp');
const { getData } = require('../parser/lbpParser');
const { fetchLBPData } = require('../services/lbpService');


const etlLbpStats = async () => {
    try {
        // Retrieve price & supply from Balancer
        const stats = await fetchLBPData(null);
        console.log('stats:', stats);

        // Check timestamp JSON fields
        if (!stats.price.timestamp
            || stats.price.timestamp <= 0
            || !stats.balance.timestamp
            || stats.balance.timestamp <= 0) {
            logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): wrong JSON format from data sourcing: ${stats}`);
            throw 'Data not loaded into LBP_BALANCER_V1';
        }

        // Parse data into SQL parameter
        const data = getData(stats);

        // Check SQL parameters
        if (data.length !== 7) {
            logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): wrong number of values after JSON parsing: ${data}`);
            throw 'Data not loaded into LBP_BALANCER_V1';
        }

        // Load data into LBP_BALANCER_V1
        await loadLbp(data);

    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): ${err}`);
    }
}

module.exports = {
    etlLbpStats,
};