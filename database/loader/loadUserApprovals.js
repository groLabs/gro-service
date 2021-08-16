const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    handleErr,
    isPlural,
    getApprovalEvents2,
} = require('../common/personalUtil');
const {
    parseApprovalEvents,
} = require('../common/personalParser');
const { QUERY_ERROR } = require('../constants');


const loadUserApprovals = async (fromDate, toDate, account) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserApprovals', account)) {
            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const q = (account)
                ? 'insert_cache_user_approvals.sql'
                : 'insert_user_approvals.sql';
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
        
        if (account) {
            return true;
        } else {
            const res = await loadTableUpdates('USER_APPROVALS', fromDate, toDate);
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
        if (account)
            toBlock = 'latest';
        const logs = await getApprovalEvents2(account, fromBlock, toBlock);
        if (!logs)
            return false;

        // Parse approval events
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${logs.length} approval event${isPlural(logs.length)}...`);
        const approvals = await parseApprovalEvents(logs);

        // Insert approvals into USER_APPROVALS
        // TODO: returning different types will be a problem in TS
        if (approvals)
            for (const item of approvals) {
                const params = (Object.values(item));
                const q = (account)
                    ? 'insert_cache_tmp_user_approvals.sql'
                    : 'insert_tmp_user_approvals.sql'
                const res = await query(q, params);
                if (res.status === QUERY_ERROR)
                    return false;
            }
        // TODO: missing N records added into table X
        return true;
    } catch (err) {
        handleErr(`loadUserApprovals->loadTmpUserApprovals() [blocks: ${fromBlock} to: ${toBlock}]`, err);
        return false;
    }
}

module.exports = {
    loadTmpUserApprovals,
    loadUserApprovals,
};
