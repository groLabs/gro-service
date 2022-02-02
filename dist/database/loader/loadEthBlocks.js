const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { getBlockData, getNetworkId, handleErr, isPlural, } = require('../common/personalUtil');
const { QUERY_ERROR } = require('../constants');
/// @notice Adds new blocks into table ETH_BLOCKS
/// @return True if no exceptions found, false otherwise
const loadEthBlocks = async (func, account) => {
    try {
        // Get block numbers to be processed from temporary tables on transfers (deposits & withdrawals) or approvals
        const q = (func === 'loadUserTransfers')
            ? (account)
                ? 'select_cache_distinct_blocks_tmp_transfers.sql'
                : 'select_distinct_blocks_tmp_transfers.sql'
            : (account)
                ? 'select_cache_distinct_blocks_tmp_approvals.sql'
                : 'select_distinct_blocks_tmp_approvals.sql';
        const blocks = await query(q, []);
        if (blocks.status === QUERY_ERROR)
            return false;
        // Insert new blocks into ETH_BLOCKS
        const numBlocks = blocks.rowCount;
        if (numBlocks > 0) {
            logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${numBlocks} block${isPlural(numBlocks)} from ${(func === 'loadUserTransfers')
                ? 'transfers'
                : 'approvals'}...`);
            for (const item of blocks.rows) {
                const block = await getBlockData(item.block_number);
                const params = [
                    block.number,
                    block.timestamp,
                    moment.unix(block.timestamp),
                    getNetworkId(),
                    moment.utc()
                ];
                const result = await query('insert_eth_blocks.sql', params);
                if (result.status === QUERY_ERROR)
                    return false;
            }
            logger.info(`**DB${account ? ' CACHE' : ''}: ${numBlocks} block${isPlural(numBlocks)} added into ETH_BLOCKS`);
        }
        else {
            logger.info(`**DB${account ? ' CACHE' : ''}: No blocks to be added from ${(func === 'loadUserTransfers')
                ? 'transfers'
                : 'approvals'}`);
        }
        return true;
    }
    catch (err) {
        handleErr('loadEthBlocks->loadEthBlocks()', err);
        return false;
    }
};
module.exports = {
    loadEthBlocks,
};