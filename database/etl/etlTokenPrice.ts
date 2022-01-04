import { apiCaller } from '../caller/apiCaller';
import { loadTokenPrice } from '../loader/loadTokenPrice';
import { IApiReturn } from '../interfaces';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import { showError } from '../handler/logHandler';

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
                        status: QUERY_SUCCESS,
                        data: data[coin].usd,
                    });
                } else {
                    showError(
                        'etlTokenPrice.ts->getPriceFromCoingecko()',
                        `No ${coin} token price available from Coingecko for date ${date}`
                    );
                    resolve({
                        status: QUERY_SUCCESS,
                        data: 0,
                    });
                }
            } else {
                showError(
                    'etlTokenPrice.ts->getPriceFromCoingecko()',
                    `API call to Coingecko for ${coin} token price failed: ${call.data}`
                );
                resolve(ERROR);
            }

        } catch (err) {
            showError(
                'etlTokenPrice.ts->getPriceFromCoingecko()',
                `Error in etlTokenPrice.ts->getPriceFromCoingecko(): ${err}`
            );
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