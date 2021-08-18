const moment = require('moment');
const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { getTimestampByBlockNumber } = require('../../common/chainUtil');
const { findBlockByDate } = require('../common/globalUtil');
const {
    handleErr,
    Transfer,
} = require('../common/personalUtil');
const {
    loadUserTransfers,
    loadTmpUserTransfers,
} = require('./loadUserTransfers.js');
const {
    loadUserApprovals,
    loadTmpUserApprovals,
} = require('./loadUserApprovals.js');
const { loadUserBalances } = require('./loadUserBalances');
const { loadUserNetReturns } = require('./loadUserNetReturns');
const { QUERY_ERROR } = require('../constants');


/// @notice - Deletes all data in cache tables for a given user address
///         - Determines the starting date of cache load based on max date 
///           in USER_BALANCES for a given user address
/// @param account User address for whom cache load will be performed
/// @return Array with start block and last date to be processed
const preloadCache = async (account) => {
    try {
        const params = [account];
        // TODO: if (res.every( val => (val !== 400 ))) {
        const [
            tmpApprovals,
            tmpDeposits,
            tmpWithdrawals,
            approvals,
            balances,
            netReturns,
            transfers,
            _fromDate,
        ] = await Promise.all([
            query('delete_cache_tmp_user_approvals.sql', params),
            query('delete_cache_tmp_user_deposits.sql', params),
            query('delete_cache_tmp_user_withdrawals.sql', params),
            query('delete_cache_user_approvals.sql', params),
            query('delete_cache_user_balances.sql', params),
            query('delete_cache_user_net_returns.sql', params),
            query('delete_cache_user_transfers.sql', params),
            query('select_max_load_dates.sql', params),
        ]);

        if (tmpApprovals.status === QUERY_ERROR ||
            tmpDeposits.status === QUERY_ERROR ||
            tmpWithdrawals.status === QUERY_ERROR ||
            approvals.status === QUERY_ERROR ||
            balances.status === QUERY_ERROR ||
            netReturns.status === QUERY_ERROR ||
            transfers.status === QUERY_ERROR ||
            _fromDate.status === QUERY_ERROR)
            return [];

        // User has no balance yet in USER_BALANCES
        let fromDate;
        if (!_fromDate.rows[0].max_balance_date) {
            const launchBlock = getConfig('blockchain.start_block');
            const timestamp = await getTimestampByBlockNumber(launchBlock);
            fromDate = moment
                .unix(timestamp)
                .utc();
            // It should be enough by looking a couple of days ago, but for testing purposes,
            // we look at all events from the contracts creation
            // fromDate = moment
            //     .utc()
            //     .subtract(2, 'days');
        } else {
            fromDate = moment
                .utc(_fromDate.rows[0].max_balance_date)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .add(1, 'days');
        }

        // Calculate starting date, starting block and dates range to be processed
        // const fromDate = moment
        //     .utc(_fromDate.rows[0].max_balance_date)
        //     .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        //     .add(1, 'days');
        const fromBlock = (await findBlockByDate(fromDate, true)).block;
        const toDate = moment
            .utc()
            .format('DD/MM/YYYY');

        return [fromBlock, toDate];
    } catch (err) {
        handleErr(`loadPersonalStatsCache->preloadCache() [account: ${account}]`, err);
        return [];
    }
}

const loadCache = async (account) => {
    try {
        const [fromBlock, toDate] = await preloadCache(account);
        const fromDate = toDate;

        if (fromBlock > 0) {
            const res = await Promise.all([
                loadTmpUserTransfers(fromBlock, null, Transfer.DEPOSIT, account),
                loadTmpUserTransfers(fromBlock, null, Transfer.WITHDRAWAL, account),
                loadTmpUserTransfers(fromBlock, null, Transfer.EXTERNAL_GVT_WITHDRAWAL, account),
                loadTmpUserTransfers(fromBlock, null, Transfer.EXTERNAL_GVT_DEPOSIT, account),
                loadTmpUserTransfers(fromBlock, null, Transfer.EXTERNAL_PWRD_WITHDRAWAL, account),
                loadTmpUserTransfers(fromBlock, null, Transfer.EXTERNAL_PWRD_DEPOSIT, account),
            ]);

            if (res.every(Boolean)) {
                if (await loadTmpUserApprovals(fromBlock, null, account))
                    if (await loadUserTransfers(null, null, account))
                        if (await loadUserApprovals(null, null, account))
                            if (await loadUserBalances(fromDate, toDate, account))
                                await loadUserNetReturns(fromDate, toDate, account);
            } else {
                logger.warn(`**DB: Error/s found in loadPersonalStatsCache.js->loadCache()`);
            }

        } else {
            const params = `user: ${account} fromBlock ${fromBlock}`;
            handleErr(`loadPersonalStatsCache->loadCache() Error with parameters: ${params}`, null);
        }
    } catch (err) {
        handleErr(`loadPersonalStatsCache->loadCache()`, err);
    }
}

const loadPersonalStatsCache = async (account) => {
    try {
        await loadCache(account);
    } catch (err) {
        handleErr(`loadPersonalStatsCache->loadPersonalStatsCache()`, err);
    }
}

module.exports = {
    loadPersonalStatsCache,
};