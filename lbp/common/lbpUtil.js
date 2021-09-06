const moment = require('moment');
const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { QUERY_ERROR } = require('../constants');


const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet':
                return 1;
            case 'ropsten':
                return 3;
            case 'kovan':
                return 42;
            default:
                return -1;
        }
    } catch (err) {
        logger.error('Error in loadLbp.js->getNetworkId():', err);
    }
};

const checkLastLoad = async () => {
    return await query('select_last_lbp_load.sql', []);
}

const loadTableUpdate = async (table, last_date, last_timestamp, last_block, records) => {
    try {
        const params = [
            table,
            getNetworkId(),
            last_date,
            last_timestamp,
            last_block,
            records,
            moment().utc(),
        ];
        const res = await query('insert_lbp_sys_loads.sql', params);
        if (res.status === QUERY_ERROR) {
            logger.warn(`**DB: Error in lbpUtil.js->loadTableUpdate(): Table SYS_LBP_LOADS not updated.`);
            return false;
        } else {
            return true;
        }
    } catch (err) {
        logger.error(`**DB: Error in lbpUtil.js->loadTableUpdate(): ${err}`);
    }
}

module.exports = {
    getNetworkId,
    checkLastLoad,
    loadTableUpdate,
}
