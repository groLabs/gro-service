const moment = require('moment');
const { query } = require('../handler/queryHandler');
const {
    getNetworkId,
    getBlockData,
} = require('../common/personalUtil');
const {
    getPriceGlobal,
    getPriceDetail,
} = require('../common/priceCheckParser');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const {
    checkQueryResult,
    updateTimeStamp,
} = require('../common/protocolUtil');


const loadPriceGlobal = async (prices) => {
    try {
        const price = await query('insert_protocol_price_check_global.sql', getPriceGlobal(prices));
        if (checkQueryResult(price, 'PROTOCOL_PRICE_CHECK_GLOBAL')) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        logger.error(`**DB: Error in loadPriceCheck.js->loadPriceGlobal(): ${err}`);
        return false;
    }
}

const loadPriceDetail = async (prices, pairs) => {
    try {
        let rows = 0;
        for (const pair of pairs) {
            const price = await query('insert_protocol_price_check_detail.sql', getPriceDetail(prices, pair));
            if (checkQueryResult(price, 'PROTOCOL_PRICE_CHECK_DETAILED')) {
                rows += price.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_PRICE_CHECK_DETAILED'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadPriceCheck.js->loadPriceDetail(): ${err}`);
        return false;
    }
}

const loadAllTables = async (prices, isHDL) => {
    try {
        if (prices.block_number) {
            const pairs = ['dai_usdc', 'dai_usdt', 'usdt_usdc'];
            const res = await Promise.all([
                loadPriceDetail(prices, pairs),
                loadPriceGlobal(prices),
            ]);
            if (res.every(Boolean)) {
                if (!isHDL)
                    await updateTimeStamp(prices.current_timestamp, 'PRICE_CHECK');
            } else {
                if (!isHDL)
                    logger.warn(`**DB: Errors found in loadPriceCheck.js->Table SYS_PROTOCOL_LOADS not updated.`);
            }
        } else {
            logger.error(`**DB: Error in loadPriceCheck.js->block number not found in API call`);
        }
    } catch (err) {
        logger.error(`**DB: Error in loadPriceCheck.js->loadAllTables(): ${err}`);
    }
}

module.exports = {
    loadAllTables,
}