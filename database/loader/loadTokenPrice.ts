import moment from 'moment';
import { query } from '../handler/queryHandler';
import { parseAmount } from '../common/globalUtil';
import { getPriceFromCoingecko } from '../etl/etlTokenPrice';
import {
    getGroVault,
    getPowerD,
    getUSDCeVault,
    getUSDTeVault,
    getDAIeVault,
    getUSDCeVault_1_5,
    getUSDTeVault_1_5,
    getDAIeVault_1_5,
    getUSDCeVault_1_6,
    getUSDTeVault_1_6,
    getDAIeVault_1_6,
    getUSDCeVault_1_7,
    getUSDTeVault_1_7,
    getDAIeVault_1_7,
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
            priceUSDCe_1_0,
            priceUSDTe_1_0,
            priceDAIe_1_0,
            priceUSDCe_1_5,
            priceUSDTe_1_5,
            priceDAIe_1_5,
            priceUSDCe_1_6,
            priceUSDTe_1_6,
            priceDAIe_1_6,
            priceUSDCe_1_7,
            priceUSDTe_1_7,
            priceDAIe_1_7,
        ] = await Promise.all([
            getGroVault().getPricePerShare(),
            getPowerD().getPricePerShare(),
            getPriceFromCoingecko(dateString, 'gro-dao-token'),
            getPriceFromCoingecko(dateString, 'weth'),
            getPriceFromCoingecko(dateString, 'balancer'),
            getPriceFromCoingecko(dateString, 'avalanche-2'),
            getUSDCeVault().getPricePerShare(),
            getUSDTeVault().getPricePerShare(),
            getDAIeVault().getPricePerShare(),
            getUSDCeVault_1_5().getPricePerShare(),
            getUSDTeVault_1_5().getPricePerShare(),
            getDAIeVault_1_5().getPricePerShare(),
            getUSDCeVault_1_6().getPricePerShare(),
            getUSDTeVault_1_6().getPricePerShare(),
            getDAIeVault_1_6().getPricePerShare(),
            getUSDCeVault_1_7().getPricePerShare(),
            getUSDTeVault_1_7().getPricePerShare(),
            getDAIeVault_1_7().getPricePerShare(),
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
        const priceUSDCe_1_0_Parsed = parseAmount(priceUSDCe_1_0, Base.D6);
        const priceUSDTe_1_0_Parsed = parseAmount(priceUSDTe_1_0, Base.D6);
        const priceDAIe_1_0_Parsed = parseAmount(priceDAIe_1_0, Base.D18);
        const priceUSDCe_1_5_Parsed = parseAmount(priceUSDCe_1_5, Base.D6);
        const priceUSDTe_1_5_Parsed = parseAmount(priceUSDTe_1_5, Base.D6);
        const priceDAIe_1_5_Parsed = parseAmount(priceDAIe_1_5, Base.D18);
        const priceUSDCe_1_6_Parsed = parseAmount(priceUSDCe_1_6, Base.D6);
        const priceUSDTe_1_6_Parsed = parseAmount(priceUSDTe_1_6, Base.D6);
        const priceDAIe_1_6_Parsed = parseAmount(priceDAIe_1_6, Base.D18);
        const priceUSDCe_1_7_Parsed = parseAmount(priceUSDCe_1_7, Base.D6);
        const priceUSDTe_1_7_Parsed = parseAmount(priceUSDTe_1_7, Base.D6);
        const priceDAIe_1_7_Parsed = parseAmount(priceDAIe_1_7, Base.D18);

        // Set params for the insert
        const params = [
            now,
            priceGvtParsed,
            pricePwrdParsed,
            priceGRO.data,
            priceWETH.data,
            priceBAL.data,
            priceAVAX.data,
            priceUSDCe_1_0_Parsed,
            priceUSDTe_1_0_Parsed,
            priceDAIe_1_0_Parsed,
            priceUSDCe_1_5_Parsed,
            priceUSDTe_1_5_Parsed,
            priceDAIe_1_5_Parsed,
            priceUSDCe_1_6_Parsed,
            priceUSDTe_1_6_Parsed,
            priceDAIe_1_6_Parsed,
            priceUSDCe_1_7_Parsed,
            priceUSDTe_1_7_Parsed,
            priceDAIe_1_7_Parsed,
            now,
        ];

        // Insert prices if they didn't exist in the DB or update them if they existed in the DB
        let result;
        const isToken = await query('select_token_price.sql', []);
        if (isToken.status === QUERY_ERROR) {
            showError(
                'loadTokenPrice.ts->loadTokenPrice()',
                'Error while retrieving token price data'
            );
            return false;
        } else if (isToken.rowCount > 0) {
            result = await query('update_token_price.sql', params);
        } else {
            result = await query('insert_token_price.sql', params);
        }

        // Show log
        if (result.status !== QUERY_ERROR) {
            const action = (isToken.rowCount > 0) ? 'Updated' : 'Added';
            showInfo(`${action} token prices for ${now.format('DD/MM/YYYY HH:mm:ss')}`);
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
