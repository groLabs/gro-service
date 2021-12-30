import { query } from '../handler/queryHandler';
import { loadEthBlocks } from './old_loadEthBlocks';
import { loadTableUpdates } from './loadTableUpdates';
import { handleErr, isPlural } from '../common/personalUtil';
import { getApprovalEvents } from '../listener/getApprovalEvents';
import { parseApprovalEvents } from '../parser/personalStatsParser';
import { QUERY_ERROR } from '../constants';
import { GlobalNetwork } from '../types';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

/// @notice Loads approvals into USER_STD_FACT_APPROVALS
///         Data is sourced from USER_STD_TMP_APPROVALS (full load w/o filters)
///         All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         Latest block & time processed are stored into SYS_USER_LOADS
/// @param fromDate
/// @param toDate
/// @param account
/// @return True if no exceptions found, false otherwise
const loadUserApprovals = async (fromDate, toDate, account) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserApprovals', account)) {
            // Load approvals from temporary tables into USER_STD_FACT_APPROVALS or USER_CACHE_STD_APPROVALS
            const q = (account)
                ? 'insert_user_cache_fact_approvals.sql'
                : 'insert_user_std_fact_approvals.sql';
            const params = (account)
                ? [account]
                : [];
            const res = await query(q, params);
            if (res.status === QUERY_ERROR)
                return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB${account ? ' CACHE' : ''}: ${numTransfers} record${isPlural(numTransfers)} added into USER_APPROVALS`);
        } else {
            return false;
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        } else {
            const res = await loadTableUpdates('USER_STD_FACT_APPROVALS', fromDate, toDate);
            return (res) ? true : false;
        }
    } catch (err) {
        handleErr('loadUserApprovals->loadUserApprovals()', err);
        return false;
    }
}

// @dev: STRONG DEPENDENCY with deposit transfers (related events have to be ignored)
// @DEV: Table TMP_USER_DEPOSITS must be loaded before
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const loadTmpUserApprovals = async (
    fromBlock,
    toBlock,
    account,
) => {
    try {
        // Get all approval events for a given block range
        const logs = await getApprovalEvents(account, fromBlock, toBlock);
        if (!logs || logs.length < 1)
            return false;


        for (let i = 0; i < logs.length; i++) {
            if (logs[i]) {
                // Parse approval events
                logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${logs[i].length} approval event${isPlural(logs.length)}...`);
                const approvals = await parseApprovalEvents(GlobalNetwork.ETHEREUM, logs[i]);

                // Insert approvals into USER_APPROVALS
                // TODO: returning different types will be a problem in TS
                if (approvals)
                    for (const item of approvals) {
                        const params = (Object.values(item));
                        const q = (account)
                            ? 'insert_user_approvals_tmp_cache.sql'
                            : 'insert_user_approvals_tmp.sql'
                        const res = await query(q, params);
                        if (res.status === QUERY_ERROR)
                            return false;
                    }
            }
        }
        // TODO: missing N records added into table X
        return true;
    } catch (err) {
        handleErr(`loadUserApprovals->loadTmpUserApprovals() [blocks: ${fromBlock} to: ${toBlock}]`, err);
        return false;
    }
}

export {
    loadTmpUserApprovals,
    loadUserApprovals,
};
