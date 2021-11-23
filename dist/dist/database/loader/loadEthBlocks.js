"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEthBlocks = void 0;
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const personalUtil_1 = require("../common/personalUtil");
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
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
        const blocks = await (0, queryHandler_1.query)(q, []);
        if (blocks.status === constants_1.QUERY_ERROR)
            return false;
        // Insert new blocks into ETH_BLOCKS
        const numBlocks = blocks.rowCount;
        if (numBlocks > 0) {
            logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${numBlocks} block${(0, personalUtil_1.isPlural)(numBlocks)} from ${(func === 'loadUserTransfers')
                ? 'transfers'
                : 'approvals'}...`);
            for (const item of blocks.rows) {
                const block = await (0, personalUtil_1.getBlockData)(item.block_number);
                const params = [
                    block.number,
                    block.timestamp,
                    moment_1.default.unix(block.timestamp),
                    (0, personalUtil_1.getNetworkId)(),
                    moment_1.default.utc()
                ];
                const result = await (0, queryHandler_1.query)('insert_eth_blocks.sql', params);
                if (result.status === constants_1.QUERY_ERROR)
                    return false;
            }
            logger.info(`**DB${account ? ' CACHE' : ''}: ${numBlocks} block${(0, personalUtil_1.isPlural)(numBlocks)} added into ETH_BLOCKS`);
        }
        else {
            logger.info(`**DB${account ? ' CACHE' : ''}: No blocks to be added from ${(func === 'loadUserTransfers')
                ? 'transfers'
                : 'approvals'}`);
        }
        return true;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)('loadEthBlocks->loadEthBlocks()', err);
        return false;
    }
};
exports.loadEthBlocks = loadEthBlocks;
