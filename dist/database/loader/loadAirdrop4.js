"use strict";
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { generateDateRange, handleErr, isPlural, } = require('../common/personalUtil');
const { QUERY_ERROR } = require('../constants');
const truncateTempAirdrop4 = async () => {
    try {
        const q = 'truncate_airdrop4_temp.sql';
        const result = await query(q, []);
        return (result.status === QUERY_ERROR) ? false : true;
    }
    catch (err) {
        handleErr(`loadAirdrop4->truncateTempAirdrop4()`, err);
        return false;
    }
};
const loadTempAirdrop4 = async (item, payload) => {
    try {
        const q = 'insert_airdrop4_temp.sql';
        const result = await query(q, payload);
        if (result.status === QUERY_ERROR)
            return false;
        else {
            logger.info(`Item ${item} w/address ${payload[4]} loaded into AIRDROP4_TEMP`);
            return true;
        }
    }
    catch (err) {
        handleErr(`loadAirdrop4->loadTempAirdrop4()`, err);
        return false;
    }
};
const loadAirdrop4 = async () => {
    try {
        const q = 'insert_airdrop4_final.sql';
        const result = await query(q, []);
        if (result.status === QUERY_ERROR)
            handleErr(`loadAirdrop4->loadAirdrop4(): error/s during the load into AIRDROP4_FINAL`);
        else {
            logger.info(`${result.rowCount} items loaded into AIRDROP4_FINAL`);
        }
    }
    catch (err) {
        handleErr(`loadAirdrop4->loadAirdrop4()`, err);
    }
};
module.exports = {
    truncateTempAirdrop4,
    loadTempAirdrop4,
    loadAirdrop4,
};
