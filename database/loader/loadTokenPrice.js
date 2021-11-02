const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { findBlockByDate } = require('../common/globalUtil');
const { apiCaller } = require('../common/apiCaller');
const { query } = require('../handler/queryHandler');
const {
    getNetworkId,
    handleErr,
} = require('../common/personalUtil');
const { parseAmount } = require('../parser/personalStatsParser');
const { QUERY_ERROR } = require('../constants');
const { getConfig } = require('../../common/configUtil');
const route = getConfig('route');
const { QUERY_SUCCESS } = require('../constants');
const {
    getGroVault,
    getPowerD,
    // getTokenCounter,
} = require('../common/contractUtil');

// Rretrieve GRO price for a given date via Coingecko API
const getGroPriceFromCoingecko = async (date) => {
    try {
        // Transform date 'DD/MM/YYYY' to 'DD-MM-YYYY'
        const re = new RegExp('/', 'g');
        const coingeckoDateFormat = date.replace(re, '-');

        // Call API
        const options = {
            hostname: `api.coingecko.com`,
            port: 443,
            path: `/api/v3/coins/gro-dao-token/history?date=${coingeckoDateFormat}`,
            method: 'GET',
        };
        const call = await apiCaller(options);
        if (call.status === QUERY_SUCCESS) {
            const data = JSON.parse(call.data);
            if (data.market_data) {
                return data.market_data.current_price.usd;
            } else {
                logger.error(`**DB: No GRO token price available from Coingecko for date ${date}`);
            }
        } else {
            logger.error(`**DB: API call to Coingecko for GRO token price failed: ${call.data}`);
        }

        return null;

    } catch (err) {
        logger.error(`**DB: Error in loadTokenPrice.js->getGroPriceFromCoingecko(): ${err}`);
        return null;
    }
}

const loadTokenPrice = async (date) => {
    try {
        logger.info(`**DB: Inserting token price for ${date}`);

        // calc blockTag for target date
        const day = moment.utc(date, "DD/MM/YYYY")
            .add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds');
        const blockTag = {
            blockTag: (await findBlockByDate(day, false)).block
        }

        // Retrieve token prices
        const priceGVT = parseAmount(await getGroVault().getPricePerShare(blockTag),'USD');
        const pricePWRD = parseAmount(await getPowerD().getPricePerShare(blockTag),'USD');
        const priceGRO = await getGroPriceFromCoingecko(date);

        // Store token prices into DB
        const params = [
            day,
            getNetworkId(),
            priceGVT,
            pricePWRD,
            priceGRO,
            moment.utc()
        ];
        await query('insert_token_price.sql', params);

        logger.info(`**DB: Added token prices for Vault: ${priceGVT}, PWRD: ${pricePWRD}, GRO: ${priceGRO}`);

    } catch (err) {
        // handleErr(`loadTokenPrice->loadTokenPrice()`, err);
        logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice(): ${err}`);
    }
}

module.exports = {
    loadTokenPrice,
};
