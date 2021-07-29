
const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const {
    getNetworkId,
    // getBlockData,
} = require('./personalUtil');
const moment = require('moment');
const QUERY_ERROR = 400; //TODO: in constants file


const checkLastTimestamp = async (source) => {
    return await query('select_last_protocol_load.sql', [source]);
}

const checkQueryResult = (result, table) => {
    if (result.status === QUERY_ERROR) {
        throw `Query error with table ${table}`;
    } else if (table !== 'PROTOCOL_VAULTS'
    && table !== 'PROTOCOL_RESERVES'
    && table !== 'PROTOCOL_STRATEGIES'
    && table !== 'PROTOCOL_EXPOSURE_STABLES'
    && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS'
    && table !== 'PROTOCOL_PRICE_CHECK_DETAILED') {
    // } else if (table !== 'PROTOCOL_PRICE_CHECK_DETAILED') {
        logger.info(`**DB: ${result.rowCount} records added into ${table}`);
    }
}

const updateTimeStamp = async (block_timestamp, source) => {
    try {
        const params = [
            block_timestamp,
            moment().utc(),
            getNetworkId(),
            source,
        ];
        const res = await query('update_last_protocol_load.sql', params);
        if (res === QUERY_ERROR)
            throw `Query error in updateTimeStamp()`; //TODO
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->updateTimeStamp(): ${err}`);
    }
}


module.exports = {
    checkLastTimestamp,
    checkQueryResult,
    updateTimeStamp,
}