"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadUserApprovals = exports.loadTmpUserApprovals = void 0;
const queryHandler_1 = require("../handler/queryHandler");
const loadEthBlocks_1 = require("./loadEthBlocks");
const loadTableUpdates_1 = require("./loadTableUpdates");
const personalUtil_1 = require("../common/personalUtil");
const personalStatsParser_1 = require("../parser/personalStatsParser");
const constants_1 = require("../constants");
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
        if (await (0, loadEthBlocks_1.loadEthBlocks)('loadUserApprovals', account)) {
            // Load approvals from temporary tables into USER_STD_FACT_APPROVALS or USER_CACHE_STD_APPROVALS
            const q = (account)
                ? 'insert_user_cache_fact_approvals.sql'
                : 'insert_user_std_fact_approvals.sql';
            const params = (account)
                ? [account]
                : [];
            const res = await (0, queryHandler_1.query)(q, params);
            if (res.status === constants_1.QUERY_ERROR)
                return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB${account ? ' CACHE' : ''}: ${numTransfers} record${(0, personalUtil_1.isPlural)(numTransfers)} added into USER_APPROVALS`);
        }
        else {
            return false;
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        }
        else {
            const res = await (0, loadTableUpdates_1.loadTableUpdates)('USER_STD_FACT_APPROVALS', fromDate, toDate);
            return (res) ? true : false;
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)('loadUserApprovals->loadUserApprovals()', err);
        return false;
    }
};
exports.loadUserApprovals = loadUserApprovals;
// @dev: STRONG DEPENDENCY with deposit transfers (related events have to be ignored)
// @DEV: Table TMP_USER_DEPOSITS must be loaded before
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const loadTmpUserApprovals = async (fromBlock, toBlock, account) => {
    try {
        // Get all approval events for a given block range
        const logs = await (0, personalUtil_1.getApprovalEvents2)(account, fromBlock, toBlock);
        if (!logs || logs.length < 1)
            return false;
        for (let i = 0; i < logs.length; i++) {
            if (logs[i]) {
                // Parse approval events
                logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${logs[i].length} approval event${(0, personalUtil_1.isPlural)(logs.length)}...`);
                const approvals = await (0, personalStatsParser_1.parseApprovalEvents)(logs[i]);
                // Insert approvals into USER_APPROVALS
                // TODO: returning different types will be a problem in TS
                if (approvals)
                    for (const item of approvals) {
                        const params = (Object.values(item));
                        const q = (account)
                            ? 'insert_user_cache_tmp_approvals.sql'
                            : 'insert_user_std_tmp_approvals.sql';
                        const res = await (0, queryHandler_1.query)(q, params);
                        if (res.status === constants_1.QUERY_ERROR)
                            return false;
                    }
            }
        }
        // TODO: missing N records added into table X
        return true;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadUserApprovals->loadTmpUserApprovals() [blocks: ${fromBlock} to: ${toBlock}]`, err);
        return false;
    }
};
exports.loadTmpUserApprovals = loadTmpUserApprovals;
