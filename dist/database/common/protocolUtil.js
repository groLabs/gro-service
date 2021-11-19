const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getNetworkId } = require('./personalUtil');
const moment = require('moment');
const { QUERY_ERROR } = require('../constants');
const checkLastTimestamp = async (source) => {
    return await query('select_last_protocol_load.sql', [source]);
};
const checkQueryResult = (result, table) => {
    try {
        if (result.status === QUERY_ERROR) {
            return false;
        }
        else if (table !== 'PROTOCOL_VAULTS'
            && table !== 'PROTOCOL_RESERVES'
            && table !== 'PROTOCOL_STRATEGIES'
            && table !== 'PROTOCOL_EXPOSURE_STABLES'
            && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS'
            && table !== 'PROTOCOL_PRICE_CHECK_DETAILED'
            && table !== 'PROTOCOL_SYSTEM_LIFEGUARD_STABLES') {
            logger.info(`**DB: ${result.rowCount} records added into ${table}`);
        }
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in protocolUtil.js->checkQueryResult(): ${err}`);
        return false;
    }
};
const updateTimeStamp = async (block_timestamp, source) => {
    try {
        const params = [
            block_timestamp,
            moment().utc(),
            getNetworkId(),
            source,
        ];
        const res = await query('update_last_protocol_load.sql', params);
        if (res.status === QUERY_ERROR)
            logger.error(`**DB: Error in protocolUtil.js->updateTimeStamp(): Table SYS_PROTOCOL_LOADS not updated.`);
    }
    catch (err) {
        logger.error(`**DB: Error in protocolUtil.js->updateTimeStamp(): ${err}`);
    }
};
module.exports = {
    checkLastTimestamp,
    checkQueryResult,
    updateTimeStamp,
};
