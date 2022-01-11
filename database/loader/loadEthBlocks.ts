import moment from 'moment';
import { query } from '../handler/queryHandler';
import {
    isPlural,
    getBlockData,
    getBlockDataAvax,
} from '../common/globalUtil';
import { QUERY_ERROR } from '../constants';
import { NetworkId } from '../types';
import {
    showInfo,
    showError
} from '../handler/logHandler';


/// @notice Adds new blocks into table ETH_BLOCKS
/// @param func Determines whether it is a transfer ('loadUserTransfers') or approval (otherwise)
/// @param account The user address that is triggering the block addition
/// @return True if no exceptions found, false otherwise
const loadEthBlocks = async (
    func: string,
    account: string,
): Promise<boolean> => {
    try {
        // Get block numbers to be processed from temporary tables on transfers (deposits & withdrawals) or approvals
        const q = (func === 'loadUserTransfers')
            ? (account)
                ? 'select_cache_distinct_blocks_tmp_transfers.sql'
                : 'select_distinct_blocks_tmp_transfers.sql'
            : (account)
                ? 'select_cache_distinct_blocks_tmp_approvals.sql'
                : 'select_distinct_blocks_tmp_approvals.sql';
        const params = account ? [account] : [];
        const blocks = await query(q, params);
        if (blocks.status === QUERY_ERROR)
            return false;

        // Insert new blocks into ETH_BLOCKS
        const numBlocks = blocks.rowCount;
        if (numBlocks > 0) {
            if (!account)
                showInfo(`Processing ${numBlocks} block${isPlural(numBlocks)} from ${(func === 'loadUserTransfers')
                    ? 'transfers'
                    : 'approvals'
                    }...`);
            for (const item of blocks.rows) {
                let block;
                if (item.network_id === NetworkId.AVALANCHE) {
                    block = await getBlockDataAvax(item.block_number);
                } else {
                    block = await getBlockData(item.block_number);
                }
                const params = [
                    block.number,
                    block.timestamp,
                    moment.unix(block.timestamp),
                    item.network_id,
                    moment.utc()];
                const result = await query('insert_eth_blocks.sql', params);
                if (result.status === QUERY_ERROR)
                    return false;
            }
            showInfo(`${account ? 'CACHE: ' : ''}${numBlocks} block${isPlural(numBlocks)} added into ETH_BLOCKS`);
        } else {
            if (!account)
                showInfo(`No blocks to be added from ${(func === 'loadUserTransfers')
                    ? 'transfers'
                    : 'approvals'
                    }`);
        }
        return true;
    } catch (err) {
        showError('loadEthBlocks.ts->loadEthBlocks()', err);
        return false;
    }
}

export {
    loadEthBlocks,
}
