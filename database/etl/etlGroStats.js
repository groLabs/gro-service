const { query } = require('../handler/queryHandler');
const { apiCaller } = require('../common/apiCaller');
const { getConfig } = require('../../common/configUtil');
const route = getConfig('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { loadAllTables } = require('../loader/loadGroStats');
const { checkLastTimestamp } = require('../common/protocolUtil');

const options = {
    hostname: route.gro_stats.hostname,
    port: route.gro_stats.port,
    path: route.gro_stats.path,
    method: 'GET',
};

//TODO: replace '200' by SUCCESS in global var
const etlGroStats = async () => {
    try {
        let lastTimestamp;
        const res = await checkLastTimestamp('GRO_STATS');
        if (res.status === 200) {
            lastTimestamp = res.rows[0].last_timestamp;
            if (lastTimestamp) {
                const call = await apiCaller(options);
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
                logger.error('**DB: No timestamp found in table SYS_PROTOCOL_LOADS');
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in etlGroStats.js->etlGroStats(): ${err}`);
    }
}

module.exports = {
    etlGroStats,
}
