/// Sergi to create a handler to transform LBP data retrieved from the DB
/// into a readable format for the FE

const moment = require('moment');
const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { QUERY_ERROR } = require('../constants');

const getLbpHistoricPrice = async () => {
    try {
        let result = [];
        const res = await query(`select_lbp_prices.sql`, []);
        if (res.status !== QUERY_ERROR) {
            const prices = res.rows;
            for (const price of prices) {
                result.push({
                    "time": parseFloat(price.timestamp),
                    "value": parseFloat(price.value),
                });
            }
        } else {
            return {};
        }
        return result;
    } catch (err) {
        logger.error(`**DB: Error in lbpHandler.js->getLbpPrice(): ${err}`);
    }
}

const getLbpBalanceAndPrice = async () => {
    try {
        const [
            gro_amount,
            latest_price,
            price_1h
        ] = await Promise.all([
            query(`select_lbp_latest_balance.sql`, []),
            query(`select_lbp_latest_price.sql`, []),
            query(`select_lbp_price_1h.sql`, []),
        ]);

        if (gro_amount.status === QUERY_ERROR
            || latest_price.status === QUERY_ERROR
            || price_1h.status === QUERY_ERROR) {
            return {
                "error": "no data found in DB",
            };
        } else {
            return {
                "gro_amount": (gro_amount.rowCount > 0)
                    ? parseFloat(gro_amount.rows[0].latest_balance)
                    : 'NA',
                "latest_price": (latest_price.rowCount > 0)
                    ? parseFloat(latest_price.rows[0].lastest_price)
                    : 'NA',
                "price_1h": (price_1h.rowCount > 0)
                    ? parseFloat(price_1h.rows[0].price_1h)
                    : 'NA',
            }
        }
    } catch (err) {
        logger.error(`**DB: Error in lbpHandler.js->getLbpBalanceAndPrice(): ${err}`);
    }
}

const getLbpStats = async () => {
    try {
        const result = {
            "price": await getLbpHistoricPrice(),
            ...await getLbpBalanceAndPrice(),
        }
        return result;
    } catch (err) {
        logger.error(`**DB: Error in lbpHandler.js->getLbpStats(): ${err}`);
    }
}

module.exports = {
    getLbpStats,
}