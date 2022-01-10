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
// import { loadUserApprovals, loadTmpUserApprovals } from '../loader/loadUserApprovals';
import { loadUserBalances } from '../loader/loadUserBalances';
import { loadUserNetReturns } from '../loader/loadUserNetReturns';
import { QUERY_ERROR } from '../constants';
import {
    Transfer,
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
            query('delete_user_approvals_tmp_cache.sql', params),
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


        // Retrieve blocks from dates to be processed
        //return (await findBlockByDate(fromDate, true)).block;
        const [
            _fromBlock,
            _fromBlockAvax,
        ] = await Promise.all([
            findBlockByDate(fromDate, true),
            findBlockByDateAvax(fromDate, true),
        ]);
        const fromBlock = _fromBlock.block;
        const fromBlockAvax: number = _fromBlockAvax.block;
        return [
            fromBlock,
            fromBlockAvax
        ];

    } catch (err) {
        showError(
            'etlPersonalStatsCache.ts->preloadCache()',
            `[account: ${account}]: ${err}`);
        return [-1, -1];
    }
}

const loadCache = async (account: string): Promise<boolean> => {
    try {
        const [
            fromBlock,
            fromBlockAvax,
        ] = await preloadCache(account);

        if (fromBlock > 0) {
            const res = await Promise.all([
                // Ethereum
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.DEPOSIT, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.WITHDRAWAL, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.TRANSFER_GVT_OUT, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.TRANSFER_GVT_IN, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.TRANSFER_PWRD_OUT, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.TRANSFER_PWRD_IN, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.TRANSFER_GRO_IN, account),
                loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, 'latest', Transfer.TRANSFER_GRO_OUT, account),
                // AVAX vaults v1.0
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.DEPOSIT_USDCe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_USDCe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.TRANSFER_USDCe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.TRANSFER_USDCe_OUT, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.DEPOSIT_USDTe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_USDTe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.TRANSFER_USDTe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.TRANSFER_USDTe_OUT, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.DEPOSIT_DAIe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_DAIe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.TRANSFER_DAIe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, 'latest', Transfer.TRANSFER_DAIe_OUT, account),
                // AVAX vaults v1.5
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.DEPOSIT_USDCe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_USDCe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.TRANSFER_USDCe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.TRANSFER_USDCe_OUT, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.DEPOSIT_USDTe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_USDTe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.TRANSFER_USDTe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.TRANSFER_USDTe_OUT, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.DEPOSIT_DAIe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_DAIe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.TRANSFER_DAIe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, 'latest', Transfer.TRANSFER_DAIe_OUT, account),
                // AVAX vaults v1.6
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.DEPOSIT_USDCe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_USDCe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.TRANSFER_USDCe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.TRANSFER_USDCe_OUT, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.DEPOSIT_USDTe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_USDTe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.TRANSFER_USDTe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.TRANSFER_USDTe_OUT, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.DEPOSIT_DAIe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.WITHDRAWAL_DAIe, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.TRANSFER_DAIe_IN, account),
                loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, 'latest', Transfer.TRANSFER_DAIe_OUT, account),
            ]);

            //TODO: when errors retrieving deposits, withdrawals or transfers in personalUtil->getTransferEvents()
            // (eg: Message: TypeError: Cannot read property 'PowerDollar' of undefined), it returns true!! (should be false)

            const now = moment.utc().format('DD/MM/YYYY').toString();

            if (res.every(Boolean)) {
                //if (await loadTmpUserApprovals(fromBlock, 'latest', account))
                if (await loadUserTransfers(null, null, account))
                    //if (await loadUserApprovals(null, null, account))
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
