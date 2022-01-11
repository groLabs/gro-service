import { apiCaller } from '../caller/apiCaller';
import { loadTokenPrice } from '../loader/loadTokenPrice';
import { ICall } from '../interfaces/ICall';
import { QUERY_SUCCESS } from '../constants';
import { showError } from '../handler/logHandler';
import { errorObj } from '../common/globalUtil';


// Rretrieve token price for a given date via Coingecko API
const getPriceFromCoingecko = async (
    date: string,
    coin: string,
): Promise<ICall> => {
    return new Promise(async (resolve) => {
        try {
            // Transform date 'DD/MM/YYYY' to 'DD-MM-YYYY'
            //const re = new RegExp('/', 'g');
            //const coingeckoDateFormat = date.replace(re, '-');

            // API details
            const options = {
                hostname: `api.coingecko.com`,
                port: 443,
                // path: `/api/v3/coins/${coin}/history?date=${coingeckoDateFormat}`,
                path: `/api/v3/simple/price?ids=${coin}&vs_currencies=usd`,
                method: 'GET',
            };

            // Call API
            const call: ICall = await apiCaller(options);
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
                        `No ${coin} token price available from Coingecko`
                    );
                    resolve({
                        status: QUERY_SUCCESS,
                        data: 0,
                    });
                }
            } else {
                const msg = `API call to Coingecko for ${coin} token price failed: ${call.data}`;
                showError('etlTokenPrice.ts->getPriceFromCoingecko()', msg);
                resolve(errorObj(msg));
            }

        } catch (err) {
            const msg = `Error in etlTokenPrice.ts->getPriceFromCoingecko(): ${err}`;
            showError('etlTokenPrice.ts->getPriceFromCoingecko()', msg);
            resolve(errorObj(msg));
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