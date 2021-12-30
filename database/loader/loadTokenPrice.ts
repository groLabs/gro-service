import moment from 'moment';
import { query } from '../handler/queryHandler';
import { parseAmount } from '../common/globalUtil';
import { getPriceFromCoingecko } from '../etl/etlTokenPrice';
import {
    getGroVault,
    getPowerD,
    getUSDCeVault_1_5_1,
    getUSDTeVault_1_5_1,
    getDAIeVault_1_5_1,
} from '../common/contractUtil';
import { QUERY_ERROR } from '../constants';
import { Base } from '../types';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const loadTokenPrice = async () => {
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
            getUSDCeVault_1_5_1().getPricePerShare(),
            getUSDTeVault_1_5_1().getPricePerShare(),
            getDAIeVault_1_5_1().getPricePerShare(),
        ]);

        if (priceGRO.status === QUERY_ERROR
            || priceWETH.status === QUERY_ERROR
            || priceBAL.status === QUERY_ERROR
            || priceAVAX.status === QUERY_ERROR
        ) {
            logger.error(`**DB: Error in loadTokenPrice.ts->loadTokenPrice() while retrieving prices from CoinGecko`);
            return false;
        }

        // Set params for the insert
        const params = [
            now,
            parseAmount(priceGVT, Base.D18),
            parseAmount(pricePWRD, Base.D18),
            priceGRO.data,
            priceWETH.data,
            priceBAL.data,
            priceAVAX.data,
            parseAmount(priceUSDCe, Base.D6),
            parseAmount(priceUSDTe, Base.D6),
            parseAmount(priceDAIe, Base.D18),
            now,
        ];

        // Insert prices if they didn't exist in the DB or update them if they existed in the DB
        let result;
        const isToken = await query('select_token_price.sql', []);
        if (isToken.status === QUERY_ERROR) {
            logger.error(`**DB: Error in loadTokenPrice.ts->loadTokenPrice() while retrieving token data`)
            return false;
        } else if (isToken.rowCount > 0) {
            result = await query('update_token_price.sql', params);
        } else {
            result = await query('insert_token_price.sql', params);
        }

        // Show log
        if (result.status !== QUERY_ERROR) {
            let msg = `GVT: ${parseAmount(priceGVT, Base.D18)}, PWRD: ${parseAmount(pricePWRD, Base.D18)}`;
            msg += `, GRO: ${priceGRO.data}, WETH: ${priceWETH.data}, BAL: ${priceBAL.data}, AVAX: ${priceAVAX.data}`;
            const action = (isToken.rowCount > 0) ? 'Updated' : 'Added';
            logger.info(`**DB: ${action} token prices for ${now.format('DD/MM/YYYY HH:mm:ss')} => ${msg}`);
        } else {
            const msg = ` while insterting token prices into DB with params: ${params}`;
            logger.error(`**DB: Error in loadTokenPrice.ts->loadTokenPrice() ${msg}`);
        }

    } catch (err) {
        logger.error(`**DB: Error in loadTokenPrice.js->loadTokenPrice(): ${err}`);
    }
}

export {
    loadTokenPrice,
};
