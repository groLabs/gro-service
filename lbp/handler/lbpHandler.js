/// Sergi to create a handler to transform LBP data retrieved from the DB
/// into a readable format for the FE

const moment = require('moment');
const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { QUERY_ERROR } = require('../constants');

const getLbpPrice = async () => {
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

const getLbpVolume = async () => {
    try {
        const [
            gro_amount,
            latest_price,
            price_1h
        ] = await Promise.all([
            query(`select_lbp_volume.sql`, []),
            query(`select_lbp_latest_price.sql`, []),
            query(`select_lbp_price_1h.sql`, [1630578647]),
        ]);

        if (gro_amount.status === QUERY_ERROR 
            || latest_price.status === QUERY_ERROR
            || price_1h.status === QUERY_ERROR) { 
                return {};
            } else {
                return {
                    "gro_amount": parseFloat(gro_amount.rows[0].gro_amount),
                    "latest_price": parseFloat(latest_price.rows[0].lastest_price),
                    "price_1h": parseFloat(price_1h.rows[0].price_1h),
                }
            }
    } catch (err) {
        logger.error(`**DB: Error in lbpHandler.js->getLbpVolume(): ${err}`);
    }
}

const getLbpStats = async () => {
    try {
        const result = { 
            "price": await getLbpPrice(),
            "volume": await getLbpVolume(),
        }
        return result;
    } catch (err) {
        logger.error(`**DB: Error in lbpHandler.js->getLbpStats(): ${err}`);
    }

}

module.exports = {
    getLbpStats,
}