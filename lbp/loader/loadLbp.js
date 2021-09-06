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
        return (price.status !== QUERY_ERROR) ? price.rowCount : -1;
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadPrice(): ${err}`);
        return -1;
    }
}

const loadUserTrades = async (stats) => {
    try {
        // Safety check
        if (stats.trades.length > 0 && (!stats.trades[0].blockNumber || stats.trades[0].blockNumber < 0)) {
            logger.error(`**DB: Error in loadLbp.js->loadUserTrades(): wrong format from data sourcing: ${stats.trades[0]}`);
        }
        // Load data into LBP_TMP_TRADES
        let rows = 0;
        for (const trade of stats.trades) {
            if (trade.blockNumber > 0) {
                const res = await query('insert_lbp_trades_user.sql', getTrades(trade));
                if (res.status !== QUERY_ERROR) {
                    rows += res.rowCount;
                } else {
                    return -1;
                }
            } else {
                logger.error(`**DB: Error in loadLbp.js->loadUserTrades(): wrong data format: ${trade}`);
                return -1;
            }
        }
        return rows;
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadUserTrades(): ${err}`);
        return -1;
    }
}

const loadUserAggr = async () => {
    try {
        const res = await query('insert_lbp_trades_aggr.sql', []);
        return (res.status !== QUERY_ERROR)
            ? res.rowCount
            : -1;
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadUserAggr(): ${err}`);
        return -1;
    }
}


const loadLbpTables = async (/*stats*/) => {
    try {
        const [
            priceRows,
            userTradeRows
        ] = await Promise.all([
            loadPrice(stats),
            loadUserTrades(stats),
        ]);

        if (priceRows >= 0 && userTradeRows >= 0) {
            const aggrTradeRows = await loadUserAggr();
            if (aggrTradeRows >= 0) {
                // Get latest block & timestamp from trades
                const res = await query('select_lbp_max_trades.sql', []);
                if (res.status !== QUERY_ERROR) {
                    const lastBlockNumberTrades = res.rows[0].max_block;
                    const lastTimestampTrades = res.rows[0].max_timestamp;
                    const final = await Promise.all([
                        // Update sys table for price
                        loadTableUpdate(
                            'LBP_PRICE',
                            moment.unix(stats.price.timestamp).utc(),
                            stats.price.timestamp,
                            stats.price.blockNumber,
                            priceRows,
                        ),
                        // Update sys table for user trades
                        loadTableUpdate(
                            'LBP_TRADES_USER',
                            moment.unix(lastTimestampTrades).utc(),
                            lastTimestampTrades,
                            lastBlockNumberTrades,
                            userTradeRows,
                        ),
                        // Update sys table for aggregated trades
                        loadTableUpdate(
                            'LBP_TRADES_AGGR',
                            moment.unix(lastTimestampTrades).utc(),
                            lastTimestampTrades,
                            lastBlockNumberTrades,
                            aggrTradeRows,
                        )
                    ]);

                    if (final.every(Boolean)) {
                        logger.info(`**DB: ${priceRows} record added into LBP_PRICE`);
                        logger.info(`**DB: ${userTradeRows} record/s added into LBP_TRADES_USER`);
                        logger.info(`**DB: ${aggrTradeRows} record/s added into LBP_TRADES_AGGR`);
                    } else {
                        logger.error(
                            `**DB: Error/s found in loadLbp.js->loadLbpTables() while updating SYS_LBP_LOADS`
                        );
                    }
                } else {
                    logger.warn(`**DB: Error found in loadLbp.js->loadLbpTables() when checking max block number: Table SYS_LBP_LOADS not updated.`);
                }
            } else {
                logger.warn(`**DB: Error found in loadLbp.js->loadLbpTables() when loading LBP_TRADES_AGGR: Table SYS_LBP_LOADS not updated.`);
            }
        } else {
            logger.warn(`**DB: Error found in loadLbp.js->loadLbpTables(): Table SYS_LBP_LOADS not updated.`);
        }
    } catch (err) {
        logger.error(`**DB: Error in loadLbp.js->loadLbpTables(): ${err}`);
    }
}

module.exports = {
    getNetworkId,
    // loadPrice,
    // loadUserTrades,
    loadLbpTables,
}