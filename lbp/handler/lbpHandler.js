const fs = require('fs');
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { getJSONFile } = require('../common/lbpUtil');
const { QUERY_ERROR } = require('../constants');

// Config constants
const launch_timestamp = getConfig('lbp.start_timestamp');
const lbp_start_date = getConfig('lbp.lbp_start_date');
const lbp_end_date = getConfig('lbp.lbp_end_date');
const gro_amount_total = getConfig('lbp.gro_amount_total');
const stats_folder = getConfig('stats_folder');
const NAH = 'NA';

const getLbpHistoricPrice = async () => {
    try {
        let result = [];
        const res = await query(`select_lbp_prices.sql`, []);
        if (res.status !== QUERY_ERROR) {
            const prices = res.rows;
            for (const price of prices) {
                result.push({
                    "time": price.timestamp.toString(),
                    "value": price.value,
                });
            }
        } else {
            return {
                "error": "DB error in lbpHandler.js->getLbpHistoricPrice()"
            };
        }
        return result;
    } catch (err) {
        logger.error(`**LBP: Error in lbpHandler.js->getLbpHistoricPrice(): ${err}`);
        return {
            "error": "exception in lbpHandler.js->getLbpHistoricPrice()"
        };
    }
}

const getLbpBalanceAndPrice = async () => {
    try {
        const [
            balanceAndTimestamp,
            latest_price,
            price_1h
        ] = await Promise.all([
            query(`select_lbp_latest_balance_and_timestamp.sql`, []),
            query(`select_lbp_latest_price.sql`, []),
            query(`select_lbp_price_1h.sql`, []),
        ]);

        if (balanceAndTimestamp.status === QUERY_ERROR
            || latest_price.status === QUERY_ERROR
            || price_1h.status === QUERY_ERROR) {
            return {
                "error": "DB error in lbpHandler.js->getLbpBalanceAndPrice()"
            };
        } else {
            return {
                "current_timestamp": (balanceAndTimestamp.rowCount > 0)
                    ? balanceAndTimestamp.rows[0].latest_timestamp.toString()
                    : NAH,
                "launch_timestamp": (launch_timestamp)
                    ? launch_timestamp.toString()
                    : NAH,
                "lbp_start_date": (lbp_start_date)
                    ? lbp_start_date.toString()
                    : NAH,
                "lbp_end_date": (lbp_end_date)
                    ? lbp_end_date.toString()
                    : NAH,
                "network": (nodeEnv)
                    ? nodeEnv
                    : NAH,
                "gro_amount_total": (gro_amount_total)
                    ? gro_amount_total.toString()
                    : NAH,
                "gro_amount_current": (balanceAndTimestamp.rowCount > 0)
                    ? balanceAndTimestamp.rows[0].latest_balance
                    : NAH,
                "gro_price_current": (latest_price.rowCount > 0)
                    ? latest_price.rows[0].lastest_price
                    : NAH,
                "gro_price_1h": (price_1h.rowCount > 0)
                    ? price_1h.rows[0].price_1h
                    : NAH,
            }
        }
    } catch (err) {
        logger.error(`**LBP: Error in lbpHandler.js->getLbpBalanceAndPrice(): ${err}`);
        return {
            "error": "exception in lbpHandler.js->getLbpBalanceAndPrice()"
        };
    }
}

const getLbpStatsDB = async () => {
    try {
        const result = {
            "lbp_stats": {
                "gro_price_history": await getLbpHistoricPrice(),
                ...await getLbpBalanceAndPrice(),
            }
        }
        return result;
    } catch (err) {
        logger.error(`**LBP: Error in lbpHandler.js->getLbpStatsDB(): ${err}`);
        return {
            "error": "exception in lbpHandler.js->getLbpStatsDB()"
        };
    }
}

const getLbpStatsFile = async () => {
    try {
        const result = {
            "lbp_stats": {
                ...getJSONFile()
            }
        }
        return result;
    } catch (err) {
        logger.error(`**LBP: Error in lbpHandler.js->gelLbpStatsFile(): ${err}`);
        return {
            "error": "exception in lbpHandler.js->gelLbpStatsFile()"
        };
    }
}

module.exports = {
    getLbpStatsDB,
    getLbpStatsFile,
}