/// Sergi to implement SQL loader call

const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { QUERY_ERROR } = require('../constants');
const {
    getPrice,
    getTrades,
} = require('../parser/lbpParser');
const { loadTableUpdate } = require('../common/lbpUtil');
const { getNetworkId } = require('../common/lbpUtil');


/********* SAMPLE */
const { stats } = require('./sample');
/********* SAMPLE */

const loadPrice = async (stats) => {
    try {
        // Safety check
        if (!stats.price.timestamp || stats.price.timestamp <= 0) {
            logger.error(`**DB: Error in loadLbp.js->loadPrice(): wrong format from data sourcing: ${stats.price}`);
        }
        // Load data into LBP_PRICE
        const price = await query('insert_lbp_price.sql', getPrice(stats.price));
        return (price.status !== QUERY_ERROR) ? 1 : -1;
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadPrice(): ${err}`);
        return -1;
    }
}

const loadTrades = async (stats) => {
    try {
        // Safety check
        if (stats.trades.length > 0 && (!stats.trades[0].blockNumber || stats.trades[0].blockNumber < 0)) {
            logger.error(`**DB: Error in loadLbp.js->loadTrades(): wrong format from data sourcing: ${stats.trades[0]}`);
        }
        // Load data into LBP_TRADES
        let rows = 0;
        for (const trade of stats.trades) {
            if (trade.blockNumber > 0) {
                const res = await query('insert_lbp_trades.sql', getTrades(trade));
                if (res.status !== QUERY_ERROR) {
                    rows += trade.rowCount;
                } else {
                    return -1;
                }
            } else {
                logger.error(`**DB: Error in loadLbp.js->loadTrades(): wrong data format: ${trade}`);
                return -1;
            }
        }
        return rows;
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadTrades(): ${err}`);
        return -1;
    }
}

const loadLbpTables = async (/*stats*/) => {
    try {
        console.log(stats);

        const [
            priceRows,
            tradesRows
        ] = await Promise.all([
            loadPrice(stats),
            loadTrades(stats),
        ]);

        if (priceRows >= 0 && tradesRows >= 0) {
            // Update sys table for price
            // logger.info(`**DB: ${priceRows} record added into LBP_PRICE`);
            // await loadTableUpdate(
            //     'LBP_PRICE',
            //     'last_date',
            //     stats.price.timestamp,
            //     stats.price.blockNumber,
            //     priceRows,
            //     moment.utc(),
            // );
            // // Update sys table for trades
            // logger.info(`**DB: ${tradesRows} record/s added into LBP_TRADES`);
            // // query to get the latest blockNumber and timestamp
            // await loadTableUpdate(
            //     'LBP_TRADES',
            //     'last_date',
            //     '1', //stats.price.timestamp,
            //     '2', //stats.price.blockNumber,
            //     tradesRows,
            //     moment.utc(),
            // );
        } else {
            logger.warn(`**DB: Error/s found in loadLbp.js->loadLbpTables(): Table SYS_LBP_LOADS not updated.`);
        }
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): ${err}`);
    }
}

module.exports = {
    getNetworkId,
    loadPrice,
    loadTrades,
    loadLbpTables,
}