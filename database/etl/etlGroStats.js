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

//TODO: replace '200' by SUCCESS in global var
const etlGroStats = async () => {
    try {
        let lastTimestamp;
        const res = await checkLastTimestamp();
        if (res.status === 200) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const call = await groStatsCall();
                if (call.status === 200) {
                    const stats = JSON.parse(call.data);
                    if (stats.gro_stats && 'current_timestamp' in stats.gro_stats) {
                        const currentTimestamp = parseInt(stats.gro_stats.current_timestamp);
                        if (currentTimestamp > lastTimestamp)
                            await loadAllTables(stats.gro_stats);
                    } else {
                        logger.error('**DB: No timestamp found in JSON API call');
                    }
                } else {
                    logger.error(`**DB: Error with API call: \n Error code ${call.status} \n Error description: ${call.data}`);
                }
            } else {
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOAD');
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
}

module.exports = {
    etlGroStats,
}
