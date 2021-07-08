const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    QUERY_ERROR,
    getBlockData,
    getNetworkId,
    generateDateRange,
    handleErr,
    isDeposit,
    isPlural,
} = require('../common/personalUtil');

/// @notice Loads net results into USER_NET_RETURNS
/// @dev Data sourced from USER_DEPOSITS & USER_TRANSACTIONS (full load w/o filters)
/// @param fromDate Start date to load net results
/// @param toDdate End date to load net results
const loadUserNetReturns = async (
    fromDate,
    toDate,
) => {
    try {
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB: Processing user net result/s...`);
        for (const date of dates) {
            /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
            const day = moment(date).format('MM/DD/YYYY');
            const result = await query('insert_user_net_returns.sql', [day]);
            if (result === QUERY_ERROR) return false;
            const numResults = result.rowCount;
            let msg = `**DB: ${numResults} record${isPlural(numResults)} added into `;
            msg += `USER_NET_RETURNS for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        await loadTableUpdates('USER_NET_RETURNS', fromDate, toDate);
    } catch (err) {
        handleErr(`personalHandler->loadUserNetReturns() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}

module.exports = {
    loadUserNetReturns,
};
