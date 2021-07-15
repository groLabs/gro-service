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
// const stats = stats_new;


const etlGroStats = async () => {
    try {
        let lastTimestamp;
        const res = await checkLastTimestamp();
        if (res.status === 204) {
            logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOAD');
        } else if (res.status === 200) {
            lastTimestamp = res.rows[0].last_timestamp;
            const stats = JSON.parse(await groStatsCall());
            if (stats.gro_stats && 'current_timestamp' in stats.gro_stats) {
                const currentTimestamp = parseInt(stats.gro_stats.current_timestamp);
                if (currentTimestamp > lastTimestamp)
                    await loadAllTables(stats.gro_stats);
            } else {
                logger.error('**DB: No timestamp found in JSON API call');
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
}

module.exports = {
    etlGroStats,
}
