import moment from 'moment';
import { query } from '../handler/queryHandler';
import { parseAmount } from '../common/globalUtil';
import { getPriceFromCoingecko } from '../etl/etlTokenPrice';
import {
    getGroVault,
    getPowerD,
    getUSDCeVault_1_5,
    getUSDTeVault_1_5,
    getDAIeVault_1_5,
} from '../common/contractUtil';
import { QUERY_ERROR } from '../constants';
import { Base } from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


const loadTokenPrice = async (): Promise<boolean> => {
    try {
        const now = moment.utc();
        const dateString = moment(now).format('DD/MM/YYYY');

        // Retrieve token prices
        const [
            priceGVT,
            pricePWRD,
            priceGRO,
            priceWETH,
            priceBAL,
            priceAVAX,
            priceUSDCe,
            priceUSDTe,
            priceDAIe,
        ] = await Promise.all([
            getGroVault().getPricePerShare(),
            getPowerD().getPricePerShare(),
            getPriceFromCoingecko(dateString, 'gro-dao-token'),
            getPriceFromCoingecko(dateString, 'weth'),
            getPriceFromCoingecko(dateString, 'balancer'),
            getPriceFromCoingecko(dateString, 'avalanche-2'),
            getUSDCeVault_1_5().getPricePerShare(),
            getUSDTeVault_1_5().getPricePerShare(),
            getDAIeVault_1_5().getPricePerShare(),
        ]);

        if (priceGRO.status === QUERY_ERROR
            || priceWETH.status === QUERY_ERROR
            || priceBAL.status === QUERY_ERROR
            || priceAVAX.status === QUERY_ERROR
        ) {
            showError(
                'loadTokenPrice.ts->loadTokenPrice()',
                'while retrieving prices from CoinGecko'
            );
            return false;
        }

        // Store parsed amounts for reuse
        const priceGvtParsed = parseAmount(priceGVT, Base.D18);
        const pricePwrdParsed = parseAmount(pricePWRD, Base.D18);
        const priceUSDCeParsed = parseAmount(priceUSDCe, Base.D6);
        const priceUSDTeParsed = parseAmount(priceUSDTe, Base.D6);
        const priceDAIeParsed = parseAmount(priceDAIe, Base.D18);

        // Set params for the insert
        const params = [
            now,
            priceGvtParsed,
            pricePwrdParsed,
            priceGRO.data,
            priceWETH.data,
            priceBAL.data,
            priceAVAX.data,
            priceUSDCeParsed,
            priceUSDTeParsed,
            priceDAIeParsed,
            now,
        ];

        // Insert prices if they didn't exist in the DB or update them if they existed in the DB
        let result;
        const isToken = await query('select_token_price.sql', []);
        if (isToken.status === QUERY_ERROR) {
            showError(
                'loadTokenPrice.ts->loadTokenPrice()',
                'Error while retrieving token data'
            );
            return false;
        } else if (isToken.rowCount > 0) {
            result = await query('update_token_price.sql', params);
        } else {
            result = await query('insert_token_price.sql', params);
        }

        // Show log
        if (result.status !== QUERY_ERROR) {
            let msg = `GVT: ${priceGvtParsed}, PWRD: ${pricePwrdParsed}`;
            msg += `, GRO: ${priceGRO.data}, WETH: ${priceWETH.data}`;
            msg += `, BAL: ${priceBAL.data}, AVAX: ${priceAVAX.data}`;
            msg += `, USDCe: ${priceUSDCeParsed}, USDTe: ${priceUSDTeParsed}`;
            msg += `, DAIe: ${priceDAIeParsed}`;
            const action = (isToken.rowCount > 0) ? 'Updated' : 'Added';
            showInfo(`${action} token prices for ${now.format('DD/MM/YYYY HH:mm:ss')} => ${msg}`);
        } else {
            showError(
                'loadTokenPrice.ts->loadTokenPrice()',
                `Error while insterting token prices into DB with params: ${params}`
            );
        }

    } catch (err) {
        showError('loadTokenPrice.ts->loadTokenPrice()', err);
        return false;
    }
}

export {
    loadTokenPrice,
};
