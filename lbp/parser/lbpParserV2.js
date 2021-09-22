const moment = require('moment');
const { getNetworkId } = require('../common/lbpUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const {
    GRO_TICKER,
    USDC_TICKER,
} = require('../constants');


const parseV2 = (stats) => {
    try {
        let gro_balance;
        let usdc_balance;
        for (const pool of stats.poolTokens) {
            if (pool.symbol.toUpperCase() === GRO_TICKER) {
                gro_balance = pool.balance;
            } else if (pool.symbol.toUpperCase() === USDC_TICKER) {
                usdc_balance = pool.balance;
            }
        }
        return [
            parseFloat(gro_balance),
            parseFloat(usdc_balance),
        ];
    } catch (err) {
        logger.error(`**LBP: Error in lbpParserV2.js->parseV2(): ${err}`);
        return [];
    }
}


const getDataV2 = (stats) => {
    try {
        return [
            moment.unix(stats.price.timestamp).utc(),
            stats.price.timestamp,
            stats.price.blockNumber,
            getNetworkId(),
            parseFloat(stats.price.price),
            parseFloat(stats.balance.balance),
            moment().utc(),
        ];
    } catch (err) {
        logger.error(`**LBP: Error in lbpParserV2.js->getDataV2(): ${err}`);
        return [];
    }
}

module.exports = {
    parseV2,
    getDataV2,
}
