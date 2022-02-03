import moment from 'moment';
import { query } from '../handler/queryHandler';
import {
    findBlockByDate,
    findBlockByDateAvax,
} from '../common/globalUtil';
import {
    loadUserTransfers,
    loadTmpUserTransfers
} from '../loader/loadUserTransfers';
import { loadUserApprovals, loadTmpUserApprovals } from '../loader/loadUserApprovals';
import { loadUserBalances } from '../loader/loadUserBalances';
import { loadUserNetReturns } from '../loader/loadUserNetReturns';
import { QUERY_ERROR } from '../constants';
import {
    Transfer,
    LoadType,
    GlobalNetwork as GN,
    ContractVersion as Ver,
} from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


/// @notice - Deletes all data in cache tables for a given user address
///         - Determines the starting date of cache load based on max date
///           in USER_BALANCES for a given user address
/// @param account User address for whom cache load will be performed
/// @return Array with start block and last date to be processed
const preloadCache = async (account: string) => {
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
            maxTransferDate,
        ] = await Promise.all([
            query('delete_user_approvals_cache_tmp.sql', params),
            query('delete_user_deposits_cache.sql', params),
            query('delete_user_withdrawals_cache.sql', params),
            query('delete_user_approvals_cache.sql', params),
            query('delete_user_balances_cache.sql', params),
            query('delete_user_net_returns_cache.sql', params),
            query('delete_user_transfers_cache.sql', params),
            query('select_max_load_dates.sql', []),
        ]);

        if (tmpApprovals.status === QUERY_ERROR
            || tmpDeposits.status === QUERY_ERROR
            || tmpWithdrawals.status === QUERY_ERROR
            || approvals.status === QUERY_ERROR
            || balances.status === QUERY_ERROR
            || netReturns.status === QUERY_ERROR
            || transfers.status === QUERY_ERROR
            || maxTransferDate.status === QUERY_ERROR) {
            showError(
                `etlPersonalStatsCache.ts->preloadCache()`,
                'Error while deleting cache tables',
            );
            return [-1, -1];
        }

        // Start retrieving data from the D+1 after the last transfers load
        let fromDate = moment
            .utc(maxTransferDate.rows[0].max_transfer_date)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .add(1, 'days');
        let toDate = moment.utc();


        // Retrieve blocks from dates to be processed
        const [
            _fromBlock,
            _toBlock,
            _fromBlockAvax,
            _toBlockAvax,
        ] = await Promise.all([
            findBlockByDate(fromDate, true),
            findBlockByDate(toDate, true),
            findBlockByDateAvax(fromDate, true),
            findBlockByDateAvax(toDate, true),
        ]);

        const fromBlock = _fromBlock.block;
        const toBlock = _toBlock.block;
        const fromBlockAvax = _fromBlockAvax.block;
        const toBlockAvax = _toBlockAvax.block;

        return [
            fromBlock,
            toBlock,
            fromBlockAvax,
            toBlockAvax,
        ];

    } catch (err) {
        showError(
            'etlPersonalStatsCache.ts->preloadCache()',
            `[account: ${account}]: ${err}`);
        return [-1, -1];
    }
}


//TODO2: ***** Use vault end dates, so no need to retrieve events for contracts that have been migrated
const loadCache = async (account: string): Promise<boolean> => {
    try {
        const [
            fromBlock,
            toBlock,
            fromBlockAvax,
            toBlockAvax,
        ] = await preloadCache(account);

        // Number of Avax contract versions
        const numAvaxVersions = (Object.keys(Ver).length / 2) - 1;

        if (fromBlock > 0) {

            let result = [];

            // Ethereum transfers
            result.push(...[...Array(8)].map((_, i) => loadTmpUserTransfers(
                GN.ETHEREUM,
                Ver.NO_VERSION,
                fromBlock,
                toBlock,
                i + 1,
                account,
                true))
            );

            // Ethereum approvals
            result.push(
                loadTmpUserApprovals(
                    GN.ETHEREUM,
                    Ver.NO_VERSION,
                    fromBlock,
                    toBlock,
                    Transfer.DEPOSIT,
                    account,
                    true)
            );


            // Load transfers types 500 to 511 from Avalanche (see types.ts->enum Transfer)
            // for every vault version
            for (let version = 1; version <= numAvaxVersions; version++) {
                result.push(...[...Array(12)].map((_, i) => loadTmpUserTransfers(
                    GN.AVALANCHE,
                    version,
                    fromBlockAvax,
                    toBlockAvax,
                    i + 500,
                    account,
                    true))
                );
            }

            // Load approvals from Avalanche for every vault version
            for (let version = 1; version <= numAvaxVersions; version++) {
                result.push(loadTmpUserApprovals(
                    GN.AVALANCHE,
                    version,
                    fromBlockAvax,
                    toBlockAvax,
                    Transfer.DEPOSIT_USDCe,
                    account,
                    true)
                );
            }

            const now = moment.utc().format('DD/MM/YYYY').toString();

            const res = await Promise.all(result);

            if (res.every(Boolean)) {
                if (await loadUserTransfers(null, null, account, GN.ALL,  LoadType.TRANSFERS))
                    if (await loadUserApprovals(null, null, account, GN.ALL, LoadType.APPROVALS))
                        if (await loadUserBalances(now, now, account, ''))
                            if (await loadUserNetReturns(account))
                                return true;
            } else {
                showError(
                    'etlPersonalStatsCache.ts->loadCache()',
                    'Error/s found during the loads'
                );
            }

        } else {
            const params = `user: ${account} fromBlock ${fromBlock}`;
            showError(
                'etlPersonalStatsCache.ts->loadCache()',
                `Error with parameters: ${params}`);
        }
        return false;
    } catch (err) {
        showError(`etlPersonalStatsCache.ts->loadCache()`, err);
        return false;
    }
}

const etlPersonalStatsCache = async (account: string): Promise<boolean> => {
    try {
        const res = await loadCache(account);
        if (res) {
            showInfo(`Personal stats for account ${account} is completed ;)`);
            return true;
        } else {
            showError(
                'etlPersonalStatsCache.ts->etlPersonalStatsCache()',
                `Personal stats load for account ${account} is NOT completed :/`
            );
            return false;
        }
    } catch (err) {
        showError(`etlPersonalStatsCache.ts->etlPersonalStatsCache()`, err);
    }
}

export {
    etlPersonalStatsCache,
};
