const { query } = require('../handler/queryHandler');
const { groStatsCall } = require('../common/groStatsCall');
const config = require('config');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const {
    loadAllTables,
    checkLastTimestamp
} = require('../loader/loadGroStats');

/* TEST VALUES */
// const { stats_new } = require('./sample_new');
// const stats2 = stats_new.gro_stats;

// checks last timestamp stored in DB and compares to current statsBot timestamp
const etlGroStats = async () => {
    try {
        const lastTimestamp = await checkLastTimestamp();
        if (lastTimestamp) {
            const stats = JSON.parse(await groStatsCall());
            // TODO: pre-check grostats format is OK
            const currentTimestamp = parseInt(stats.gro_stats.current_timestamp);
            if (currentTimestamp > lastTimestamp)
                await loadAllTables(stats.gro_stats);
        } else {
            logger.warn('**DB: No timestamp found in DB!');
        }
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
}

module.exports = {
    etlGroStats,
}
