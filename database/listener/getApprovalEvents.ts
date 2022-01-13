import { query } from '../handler/queryHandler';
import { QUERY_ERROR } from '../constants';
import { getFilterEvents } from '../../common/logFilter';
import { getCoinApprovalFilters } from '../../common/filterGenerateTool';
import { showError, showWarning } from '../handler/logHandler';

// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
// TODO: can't return boolean or events (not TS rulez)
const getApprovalEvents = async (account, fromBlock, toBlock) => {
    try {
        const logApprovals = await getCoinApprovalFilters(
            'default',
            fromBlock,
            toBlock,
            account
        );
        const logPromises = [];
        for (let i = 0; i < logApprovals.length; i += 1) {
            const approvalEvent = logApprovals[i];
            logPromises.push(
                getFilterEvents(
                    approvalEvent.filter,
                    approvalEvent.interface,
                    'default'
                )
            );
        }
        const logs = await Promise.all(logPromises);

        // Remove approvals referring to deposits (only get stablecoin approvals)
        const depositTx = [];
        const q = account
            ? 'select_cache_tmp_deposits.sql'
            : 'select_tmp_deposits.sql';
        const res = await query(q, []);
        if (res.status === QUERY_ERROR) {
            return false;
        } else if (res.rows.length === 0) {
            showWarning(
                'getApprovalEvents.ts->getApprovalEvents()',
                '0 deposit transfers before processing approval events'
            );
        } else {
            for (const tx of res.rows) {
                depositTx.push(tx.tx_hash);
            }
        }
        let logsFiltered = [];
        for (let i = 0; i < logs.length; i++) {
            logsFiltered.push(
                logs[i].filter(
                    (item) => !depositTx.includes(item.transactionHash)
                )
            );
        }

        return logsFiltered;
    } catch (err) {
        showError(
            'getApprovalEvents.ts->getApprovalEvents()',
            `[blocks: from ${fromBlock} to: ${toBlock}, account: ${account}]: ${err}`
        );
        return false;
    }
};

export { getApprovalEvents };
