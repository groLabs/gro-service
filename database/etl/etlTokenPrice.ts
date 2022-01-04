import { apiCaller } from '../caller/apiCaller';
import { loadTokenPrice } from '../loader/loadTokenPrice';
import { IApiReturn } from '../interfaces';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

const ERROR: IApiReturn = {
    status: QUERY_ERROR,
    data: null,
}


// Rretrieve token price for a given date via Coingecko API
const getPriceFromCoingecko = async (
    date: string,
    coin: string,
): Promise<IApiReturn> => {
    return new Promise(async (resolve) => {
        try {
            // Transform date 'DD/MM/YYYY' to 'DD-MM-YYYY'
            //const re = new RegExp('/', 'g');
            //const coingeckoDateFormat = date.replace(re, '-');

            // Call API
            const options = {
                hostname: `api.coingecko.com`,
                port: 443,
                // path: `/api/v3/coins/${coin}/history?date=${coingeckoDateFormat}`,
                path: `/api/v3/simple/price?ids=${coin}&vs_currencies=usd`,
                method: 'GET',
            };

            // Resolve result
            const call: IApiReturn = await apiCaller(options);

            if (call.status === QUERY_SUCCESS) {
                const data = JSON.parse(call.data);
                if (data[coin]) {
                    resolve({
                        data: data[coin].usd,
                        status: QUERY_SUCCESS,
                    });
                } else {
                    logger.error(`**DB: No ${coin} token price available from Coingecko for date ${date}`);
                    resolve({
                        data: 0,
                        status: QUERY_SUCCESS,
                    });
                }
            } else {
                logger.error(`**DB: API call to Coingecko for ${coin} token price failed: ${call.data}`);
                resolve(ERROR);
            }

        } catch (err) {
            logger.error(`**DB: Error in etlTokenPrice.ts->getPriceFromCoingecko(): ${err}`);
            resolve(ERROR);
        }
    });
}

const etlTokenPrice = async () => {
    await loadTokenPrice();
}

export {
    getPriceFromCoingecko,
    etlTokenPrice,
};