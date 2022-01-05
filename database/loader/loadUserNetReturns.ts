import moment from 'moment';
import { query } from '../handler/queryHandler';
import { isPlural } from '../common/globalUtil';
import { generateDateRange } from '../common/personalUtil';
import { QUERY_ERROR } from '../constants';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


/// @notice Load net returns into USER_STD_FACT_NET_RETURNS
/// @dev    Data sourced from USER_STD_FACT_TRANSFERS, USER_STD_FACT_BALANCES & TOKEN_PRICE (full load w/o filters)
/// @param  fromDate Start date to load net returns
/// @param  toDdate End date to load net returns
/// @param  account User address for cache loading; null for daily loads
const loadUserNetReturns = async (
    fromDate: string,
    toDate: string,
    account: string,
): Promise<boolean> => {
    try {
        const dates = generateDateRange(fromDate, toDate);
        showInfo(`${account ? 'CACHE: ' : ''}Processing user net returns...`);
        for (const date of dates) {
            /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
            const q = (account)
                ? 'insert_user_net_returns_cache.sql'
                : 'insert_user_net_returns.sql';
            const params = (account)
                ? [account]
                : [moment(date)
                    .format('MM/DD/YYYY')];
            const result = await query(q, params);
            if (result.status === QUERY_ERROR)
                return false;
            const numResults = result.rowCount;
            let msg = `${account ? 'CACHE: ' : ''}${numResults} record${isPlural(numResults)} added into `;
            msg += `USER_NET_RETURNS_CACHE for date ${moment(date).format('DD/MM/YYYY')}`;
            showInfo(msg);
        }
        return true;
    } catch (err) {
        showError(
            'loadUserNetReturns.ts->loadUserNetReturns()',
            `[from: ${fromDate}, to: ${toDate}]: ${err}`
        );
        return false;
    }
}

export {
    loadUserNetReturns,
};
