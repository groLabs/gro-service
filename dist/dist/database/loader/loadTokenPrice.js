"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTokenPrice = void 0;
const moment_1 = __importDefault(require("moment"));
const globalUtil_1 = require("../common/globalUtil");
const apiCaller_1 = require("../common/apiCaller");
const queryHandler_1 = require("../handler/queryHandler");
const loadTableUpdates_1 = require("./loadTableUpdates");
const personalUtil_1 = require("../common/personalUtil");
const personalStatsParser_1 = require("../parser/personalStatsParser");
const constants_1 = require("../constants");
const contractUtil_1 = require("../common/contractUtil");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
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
            const call = await (0, apiCaller_1.apiCaller)(options);
            if (call.status === constants_1.QUERY_SUCCESS) {
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
        const fromDateParsed = (0, moment_1.default)(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = (0, moment_1.default)(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        const res = await (0, queryHandler_1.query)('delete_token_price.sql', params);
        if (res.status === constants_1.QUERY_ERROR)
            return false;
        const dates = (0, personalUtil_1.generateDateRange)(fromDate, toDate);
        for (const date of dates) {
            // Calc blockTag for target date
            const day = date
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');
            const blockTag = {
                // @ts-ignore
                blockTag: (await (0, globalUtil_1.findBlockByDate)(day, false)).block
            };
            //TODO ****** : test data reload before GRO token
            // Retrieve token prices
            const dateString = (0, moment_1.default)(date).format('DD/MM/YYYY');
            const [priceGVT, pricePWRD, priceGRO, priceWETH, priceBAL, priceAVAX] = await Promise.all([
                (0, contractUtil_1.getGroVault)().getPricePerShare(blockTag),
                (0, contractUtil_1.getPowerD)().getPricePerShare(blockTag),
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
                (0, personalUtil_1.getNetworkId)(),
                (0, personalStatsParser_1.parseAmount)(priceGVT, 'USD'),
                (0, personalStatsParser_1.parseAmount)(pricePWRD, 'USD'),
                priceGRO,
                priceWETH,
                priceBAL,
                priceAVAX,
                moment_1.default.utc()
            ];
            // Insert token prices into DB
            const result = await (0, queryHandler_1.query)('insert_token_price.sql', params);
            if (result.status !== constants_1.QUERY_ERROR) {
                let tokenPrices = `GVT: ${(0, personalStatsParser_1.parseAmount)(priceGVT, 'USD')}, PWRD: ${(0, personalStatsParser_1.parseAmount)(pricePWRD, 'USD')}`;
                tokenPrices += `, GRO: ${priceGRO}, WETH: ${priceWETH}, BAL: ${priceBAL}, AVAX: ${priceAVAX}`;
                logger.info(`**DB: Added token prices for ${dateString} => ${tokenPrices}`);
            }
            else {
                const msg = ` while insterting token prices into DB with params: ${params}`;
                logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice() ${msg}`);
            }
        }
        // Update table SYS_USER_LOADS with the last loads
        return await (0, loadTableUpdates_1.loadTableUpdates)('TOKEN_PRICE', fromDate, toDate);
    }
    catch (err) {
        logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice(): ${err}`);
    }
};
exports.loadTokenPrice = loadTokenPrice;
