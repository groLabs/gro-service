const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { findBlockByDate } = require('../common/globalUtil');
const { apiCaller } = require('../common/apiCaller');
const { query } = require('../handler/queryHandler');
const { loadTableUpdates } = require('./loadTableUpdates');
const { getNetworkId, generateDateRange, handleErr, } = require('../common/personalUtil');
const { parseAmount } = require('../parser/personalStatsParser');
const { QUERY_ERROR } = require('../constants');
const { getConfig } = require('../../dist/common/configUtil');
const route = getConfig('route');
const { QUERY_SUCCESS } = require('../constants');
const { getGroVault, getPowerD,
// getTokenCounter,
 } = require('../common/contractUtil');
// Rretrieve GRO price for a given date via Coingecko API
const getPriceFromCoingecko = async (date, coin) => {
    return new Promise(async (resolve) => {
        try {
            // Transform date 'DD/MM/YYYY' to 'DD-MM-YYYY'
            const re = new RegExp('/', 'g');
            const coingeckoDateFormat = date.replace(re, '-');
            // Call API
            const options = {
                hostname: `api.coingecko.com`,
                port: 443,
                path: `/api/v3/coins/${coin}/history?date=${coingeckoDateFormat}`,
                method: 'GET',
            };
            const call = await apiCaller(options);
            if (call.status === QUERY_SUCCESS) {
                const data = JSON.parse(call.data);
                if (data.market_data) {
                    resolve(data.market_data.current_price.usd);
                }
                else {
                    logger.error(`**DB: No GRO token price available from Coingecko for date ${date}`);
                }
            }
            else {
                logger.error(`**DB: API call to Coingecko for GRO token price failed: ${call.data}`);
            }
            resolve(null);
        }
        catch (err) {
            logger.error(`**DB: Error in loadTokenPrice.js->getPriceFromCoingecko(): ${err}`);
            resolve(null);
        }
    });
};
const loadTokenPrice = async (fromDate, toDate) => {
    try {
        // Remove previous data
        const fromDateParsed = moment(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = moment(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        const res = await query('delete_token_price.sql', params);
        if (res.status === QUERY_ERROR)
            return false;
        const dates = generateDateRange(fromDate, toDate);
        for (const date of dates) {
            // Calc blockTag for target date
            const day = date
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');
            const blockTag = {
                blockTag: (await findBlockByDate(day, false)).block
            };
            //TODO ****** : test data reload before GRO token 
            // Retrieve token prices
            const dateString = moment(date).format('DD/MM/YYYY');
            const [priceGVT, pricePWRD, priceGRO, priceWETH, priceBAL, priceAVAX] = await Promise.all([
                getGroVault().getPricePerShare(blockTag),
                getPowerD().getPricePerShare(blockTag),
                getPriceFromCoingecko(dateString, 'gro-dao-token'),
                getPriceFromCoingecko(dateString, 'weth'),
                getPriceFromCoingecko(dateString, 'balancer'),
                getPriceFromCoingecko(dateString, 'avalanche-2')
            ]);
            if (!priceGRO || !priceWETH || !priceBAL || !priceAVAX) {
                logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice() while retrieving prices from Coingecko`);
                return false;
            }
            // Set params for the insert
            const params = [
                day,
                getNetworkId(),
                parseAmount(priceGVT, 'USD'),
                parseAmount(pricePWRD, 'USD'),
                priceGRO,
                priceWETH,
                priceBAL,
                priceAVAX,
                moment.utc()
            ];
            // Insert token prices into DB
            const result = await query('insert_token_price.sql', params);
            if (result.status !== QUERY_ERROR) {
                let tokenPrices = `GVT: ${parseAmount(priceGVT, 'USD')}, PWRD: ${parseAmount(pricePWRD, 'USD')}`;
                tokenPrices += `, GRO: ${priceGRO}, WETH: ${priceWETH}, BAL: ${priceBAL}, AVAX: ${priceAVAX}`;
                logger.info(`**DB: Added token prices for ${dateString} => ${tokenPrices}`);
            }
            else {
                const msg = ` while insterting token prices into DB with params: ${params}`;
                logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice() ${msg}`);
            }
        }
        // Update table SYS_USER_LOADS with the last loads
        return await loadTableUpdates('TOKEN_PRICE', fromDate, toDate);
    }
    catch (err) {
        logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice(): ${err}`);
    }
};
module.exports = {
    loadTokenPrice,
};
