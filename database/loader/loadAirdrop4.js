const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const {
    generateDateRange,
    handleErr,
    isPlural,
} = require('../common/personalUtil');
const { QUERY_ERROR } = require('../constants');


const loadAirdrop4 = async (payload) => {
    try {
        const q = 'insert_airdrop4.sql';
        const result = await query(q, payload);
        if (result.status === QUERY_ERROR)
            return false;
        else {
            logger.info(`Address ${payload[4]} added into AIRDROP4`);
            return true;
        }
    } catch (err) {
        handleErr(`loadAirdrop4->loadAirdrop4()`, err);
        return false;
    }
}

module.exports = {
    loadAirdrop4,
}
