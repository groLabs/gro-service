const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    QUERY_ERROR,
    handleErr,
    isPlural,
    getApprovalEvents2,
} = require('../common/personalUtil');
const {
    parseApprovalEvents,
} = require('../common/personalParser');


// @dev: STRONG DEPENDENCY with deposit transfers (related events have to be ignored) 
// @DEV: Table TMP_USER_DEPOSITS must be loaded before
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const loadTmpUserApprovals = async (
    fromBlock,
    toBlock,
) => {
    try {
        // Get all approval events for a given block range
        const logs = await getApprovalEvents2(null, fromBlock, toBlock);
        if (!logs)
            return false;

        // Parse approval events
        logger.info(`**DB: Processing ${logs.length} approval event${isPlural(logs.length)}...`);
        const approvals = await parseApprovalEvents(logs);

        // Insert approvals into USER_APPROVALS
        // TODO: returning different types will be a problem in TS
        if (approvals)
            for (const item of approvals) {
                const params = (Object.values(item));
                const res = await query('insert_tmp_user_approvals.sql', params);
                if (res.status === QUERY_ERROR) return false;
            }
        // TODO: missing N records added into table X
        return true;
    } catch (err) {
        handleErr(`personalHandler->loadTmpUserApprovals() [blocks: ${fromBlock} to: ${toBlock}]`, err);
        return false;
    }
}

const loadUserApprovals = async (fromDate, toDate) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserApprovals')) {
            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const res = await query('insert_user_approvals.sql', []);
            if (res.status === QUERY_ERROR) return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB: ${numTransfers} record${isPlural(numTransfers)} added into USER_APPROVALS`);
        } else {
            return false;
        }
        const res = await loadTableUpdates('USER_APPROVALS', fromDate, toDate);
        return (res) ? true : false;
    } catch (err) {
        handleErr('personalHandler->loadUserApprovals()', err);
        return false;
    }
}

module.exports = {
    loadTmpUserApprovals,
    loadUserApprovals,
};
