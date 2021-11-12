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
} = require('../loader/loadUserTransfers');
const {
    loadUserApprovals,
    loadTmpUserApprovals,
} = require('../loader/loadUserApprovals');
const { loadUserBalances2 } = require('../loader/loadUserBalances2');
const { loadUserNetReturns } = require('../loader/loadUserNetReturns');
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
            balancesUnstaked,
            balancesStaked,
            balancesPooled,
            // netReturns,
            netReturnsUnstaked,
            transfers,
            _fromDate,
        ] = await Promise.all([
            query('delete_user_cache_tmp_approvals.sql', params),
            query('delete_user_cache_tmp_deposits.sql', params),
            query('delete_user_cache_tmp_withdrawals.sql', params),
            query('delete_user_cache_fact_approvals.sql', params),
            query('delete_user_cache_fact_balances_unstaked.sql', params),
            query('delete_user_cache_fact_balances_staked.sql', params),
            query('delete_user_cache_fact_balances_pooled.sql', params),
            // query('delete_user_cache_fact_net_returns.sql', params),
            query('delete_user_cache_fact_net_returns_unstaked.sql', params),
            query('delete_user_cache_fact_transfers.sql', params),
            query('select_max_load_dates.sql', params),
        ]);

        if (tmpApprovals.status === QUERY_ERROR ||
            tmpDeposits.status === QUERY_ERROR ||
            tmpWithdrawals.status === QUERY_ERROR ||
            approvals.status === QUERY_ERROR ||
            balancesUnstaked.status === QUERY_ERROR ||
            balancesStaked.status === QUERY_ERROR ||
            balancesPooled.status === QUERY_ERROR ||
            // netReturns.status === QUERY_ERROR ||
            netReturnsUnstaked.status === QUERY_ERROR ||
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
        handleErr(`etlPersonalStatsCache->preloadCache() [account: ${account}]`, err);
        return [];
    }
}

const loadCache = async (account) => {
    try {
        const [fromBlock, toDate] = await preloadCache(account);
        const fromDate = toDate;

        if (fromBlock > 0) {
            const res = await Promise.all([
                loadTmpUserTransfers(fromBlock, 'latest', Transfer.DEPOSIT, account),
                loadTmpUserTransfers(fromBlock, 'latest', Transfer.WITHDRAWAL, account),
                loadTmpUserTransfers(fromBlock, 'latest', Transfer.TRANSFER_GVT_OUT, account),
                loadTmpUserTransfers(fromBlock, 'latest', Transfer.TRANSFER_GVT_IN, account),
                loadTmpUserTransfers(fromBlock, 'latest', Transfer.TRANSFER_PWRD_OUT, account),
                loadTmpUserTransfers(fromBlock, 'latest', Transfer.TRANSFER_PWRD_IN, account),
            ]);

            if (res.every(Boolean)) {
                //if (await loadTmpUserApprovals(fromBlock, 'latest', account))
                if (await loadUserTransfers(null, null, account))
                    //if (await loadUserApprovals(null, null, account))
                        // TODO: time should be now(), otherwise it will take 23:59:59
                        if (await loadUserBalances2(fromDate, toDate, account, null))
                            if (await loadUserNetReturns(fromDate, toDate, account))
                                return true;


            } else {
                logger.warn(`**DB: Error/s found in etlPersonalStatsCache.js->loadCache()`);
            }

        } else {
            const params = `user: ${account} fromBlock ${fromBlock}`;
            handleErr(`etlPersonalStatsCache->loadCache() Error with parameters: ${params}`, null);
        }
        return false;
    } catch (err) {
        handleErr(`etlPersonalStatsCache->loadCache()`, err);
    }
}

const etlPersonalStatsCache = async (account) => {
    try {
        const res = await loadCache(account);
        if (res) {
            logger.info(`**DB: Personal stats for account ${account} is completed ;)`);
        } else {
            logger.error(`**DB: Personal stats load for account ${account} is NOT completed :/`);
        }
    } catch (err) {
        handleErr(`etlPersonalStatsCache->etlPersonalStatsCache()`, err);
    }
}

module.exports = {
    etlPersonalStatsCache,
};