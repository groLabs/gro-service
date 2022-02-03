import { query } from '../handler/queryHandler';
import { loadEthBlocks } from './loadEthBlocks';
import { loadTableUpdates } from './loadTableUpdates';
import {
    isPlural,
    getTokenInfoFromAddress,
} from '../common/globalUtil';
import { ICall } from '../interfaces/ICall';
import { getApprovalEvents } from '../listener/getApprovalEvents';
import { personalStatsApprovalsParser } from '../parser/personalStatsApprovalsParser'
import { QUERY_ERROR } from '../constants';
import {
    Transfer,
    GlobalNetwork,
    ContractVersion,
} from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import { getProviderAvax } from '../common/globalUtil';
import { getCoinApprovalFilters, } from '../../common/filterGenerateTool';
import { getAvaxApprovalEventFilters } from '../listener/getApprovalFiltersAvax';
import { isContractDeployed } from './loadUserTransfers';


/// @notice Loads approvals into USER_APPROVALS
///         Data is sourced from USER_APPROVALS_TMP (full load w/o filters)
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
            // Insert approvals
            const q = (account)
                ? 'insert_user_approvals_cache.sql'
                : 'insert_user_approvals.sql';
            const params = (account)
                ? [account]
                : [];
            const res = await query(q, params);
            if (res.status === QUERY_ERROR)
                return false;
            if (!account) {
                const numTransfers = res.rowCount;
                const table = 'added into USER_APPROVALS';
                showInfo(`${numTransfers} record${isPlural(numTransfers)} ${table}`);
            }
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
    _fromBlock: number,
    toBlock: any,
    side: Transfer,
    account: string,
    isCacheLoad: boolean,
): Promise<boolean> => {
    try {
        let approvalFilters;

        const [
            isDeployed,
            fromBlock,
        ] = isContractDeployed(network, contractVersion, side, _fromBlock, isCacheLoad);

        if (isDeployed) {

            const isAvax = side >= 500 && side < 1000 ? true : false;

            if (isAvax) {
                // Get all AVAX approval filters (for USDCe, USDTe, DAIe)
                approvalFilters = getAvaxApprovalEventFilters(
                    account,
                    contractVersion,
                    getProviderAvax(),
                    fromBlock,
                    toBlock,
                );
            } else {
                // Get all ETH approval filters (for GVT, PWRD, USDC, USDT, DAI)
                approvalFilters = await getCoinApprovalFilters(
                    'default',
                    fromBlock,
                    toBlock,
                    account
                );
            }

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
                                    ? 'insert_user_approvals_cache_tmp.sql'
                                    : 'insert_user_approvals_tmp.sql'

                                , param);

                            if (res.status === QUERY_ERROR)
                                return false;

                            rows += res.rowCount;
                        }
                    }
                }
                if (!account && rows > 0) {
                    const info = `${rows} ${tokenName} approval${isPlural(rows)}`;
                    showInfo(`${info} [${ContractVersion[contractVersion]}] added into USER_APPROVALS_TMP`);
                }

            }
        } else {
            // not deployed. No need to load
            console.log(`Not deployed | side: ${side}`);
        }

        return true;

    } catch (err) {
        showError(
            'loadUserApprovals.ts->loadTmpUserApprovals()',
            `[blocks: ${_fromBlock} to: ${toBlock}]: ${err}`);
        return false;
    }
}

export {
    loadUserApprovals,
    loadTmpUserApprovals,
};
