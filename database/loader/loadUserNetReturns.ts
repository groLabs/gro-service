import { query } from '../handler/queryHandler';
import { QUERY_ERROR } from '../constants';
import { showError } from '../handler/logHandler';


/// @notice Load net returns into USER_NET_RETURNS_CACHE
/// @dev    Data sourced from USER_TRANSFERS, USER_TRANSFERS_CACHE,
///         USER_BALANCES_CACHE & TOKEN_PRICE
/// @param  account The user address for cache loading
/// @return True if no exceptions found, false otherwise
const loadUserNetReturns = async (
    account: string,
): Promise<boolean> => {
    try {
        const q = 'insert_user_net_returns_cache.sql';
        const params = [account];
        const result = await query(q, params);
        return (result.status === QUERY_ERROR) ? false : true;
    } catch (err) {
        showError('loadUserNetReturns.ts->loadUserNetReturns()', err);
        return false;
    }
}

export {
    loadUserNetReturns,
};
