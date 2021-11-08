const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    generateDateRange,
    handleErr,
    isPlural,
} = require('../common/personalUtil');
const { QUERY_ERROR } = require('../constants');

/// @notice Load net returns into USER_STD_FACT_NET_RETURNS_UNSTAKED
/// @dev    Data sourced from USER_STD_FACT_DEPOSITS & USER_STD_FACT_TRANSACTIONS (full load w/o filters)
/// @param  fromDate Start date to load net returns
/// @param  toDdate End date to load net returns
/// @param  account User address for cache loading; null for daily loads
const loadUserNetReturns = async (
    fromDate,
    toDate,
    account,
) => {
    try {
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing user net returns...`);
        for (const date of dates) {
            /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
            const q = (account)
                ? 'insert_user_cache_fact_net_returns.sql' //TODO
                : 'insert_user_std_fact_net_returns_unstaked.sql';
            const params = (account)
                ? [account]
                : [moment(date)
                    .format('MM/DD/YYYY')];
            const result = await query(q, params);
            if (result.status === QUERY_ERROR)
                return false;
            const numResults = result.rowCount;
            let msg = `**DB${account ? ' CACHE' : ''}: ${numResults} record${isPlural(numResults)} added into `;
            msg += `USER_STD_FACT_NET_RETURNS_UNSTAKED for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        // Update table SYS_USER_LOADS with the last loads
        if (!account) {
            return await loadTableUpdates('USER_STD_FACT_NET_RETURNS_UNSTAKED', fromDate, toDate);
        }
            
    } catch (err) {
        handleErr(`loadUserNetReturns->loadUserNetReturns() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}

module.exports = {
    loadUserNetReturns,
};
