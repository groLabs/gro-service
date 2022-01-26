import { query } from '../handler/queryHandler';
import { loadEthBlocks } from './loadEthBlocks';
import { loadTableUpdates } from './loadTableUpdates';
import {
    isPlural,
    getTokenInfoFromAddress,
} from '../common/globalUtil';
import { transferType } from '../common/personalUtil';
import { ICall } from '../interfaces/ICall';
import { getApprovalEvents } from '../listener/getApprovalEvents';
// import { parseApprovalEvents } from '../parser/personalStatsApprovalsParser';
import { personalStatsApprovalsParser } from '../parser/personalStatsApprovalsParser'
import { QUERY_ERROR } from '../constants';
import {
    TokenId,
    Transfer,
    TokenName,
    GlobalNetwork,
    ContractVersion,
} from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';

//TEST
import {
    getCoinApprovalFilters,
} from '../../common/filterGenerateTool';

/// @notice Loads approvals into USER_STD_FACT_APPROVALS
///         Data is sourced from USER_STD_TMP_APPROVALS (full load w/o filters)
///         All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         Latest block & time processed are stored into SYS_USER_LOADS
/// @param fromDate
/// @param toDate
/// @param account
/// @return True if no exceptions found, false otherwise
const loadUserApprovals = async (
    fromDate: string,
    toDate: string,
    account: string
): Promise<boolean> => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserApprovals', account)) {
            // Insert approvals into USER_APPROVALS or USER_APPROVALS_CACHE
            const q = (account)
                ? 'insert_user_cache_fact_approvals.sql'
                : 'insert_user_approvals.sql';
            const params = (account)
                ? [account]
                : [];
            const res = await query(q, params);
            if (res.status === QUERY_ERROR)
                return false;
            const numTransfers = res.rowCount;
            showInfo(`${account ? 'CACHE: ' : ''}${numTransfers} record${isPlural(numTransfers)} added into USER_APPROVALS`);
        } else {
            return false;
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        } else {
            const res = await loadTableUpdates('USER_APPROVALS', fromDate, toDate);
            return (res) ? true : false;
        }
    } catch (err) {
        showError('loadUserApprovals.ts->loadUserApprovals()', err);
        return false;
    }
}


const loadTmpUserApprovals = async (
    network: GlobalNetwork,
    contractVersion: ContractVersion,
    fromBlock: number,
    toBlock: any,
    side: Transfer,
    account: string,
): Promise<boolean> => {
    try {

        // Get all approval filters (for GVT, PWRD, USDC, USDT, DAI)
        const approvalFilters = await getCoinApprovalFilters(
            'default',
            fromBlock,
            toBlock,
            account
        );

        //TODO: same but for AVAX

        for (const approvalFilter of approvalFilters) {

            const [tokenId, tokenName] = getTokenInfoFromAddress(approvalFilter.filter.address);
            let rows = 0;

            const logs = await getApprovalEvents(
                approvalFilter,
                side,
            );

            if (logs.status === QUERY_ERROR) {
                return false;
            } else {
                for (let i = 0; i < logs.data.length; i++) {

                    const result: ICall = await personalStatsApprovalsParser(
                        contractVersion,
                        network,
                        tokenId,
                        logs.data[i],
                        side,
                        account
                    );

                    if (result.status === QUERY_ERROR)
                        return false;

                    // Convert params from object to array
                    let params = [];
                    for (const item of result.data)
                        params.push(Object.values(item));

                    for (const param of params) {

                        const res = await query(
                            (account)
                                ? 'insert_user_approvals_tmp_cache.sql'
                                : 'insert_user_approvals_tmp.sql'

                            , param);

                        if (res.status === QUERY_ERROR)
                            return false;

                        rows += res.rowCount;
                    }
                }
            }
            if (!account)
                showInfo(`${rows} ${tokenName} approval${isPlural(rows)} added into USER_APPROVALS_TMP`);
        }

        return true;

    } catch (err) {
        showError(
            'loadUserApprovals.ts->loadTmpUserApprovals()',
            `[blocks: ${fromBlock} to: ${toBlock}]`);
        return false;
    }
}

export {
    loadUserApprovals,
    loadTmpUserApprovals,
};
