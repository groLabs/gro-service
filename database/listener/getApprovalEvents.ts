import { query } from '../handler/queryHandler';
import { QUERY_ERROR } from '../constants';
import { getFilterEvents } from '../../common/logFilter-new';
import { getCoinApprovalFilters } from '../../common/filterGenerateTool';
import { handleErr } from '../common/personalUtil';
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
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
            logger.info(
                `**DB: Warning! 0 deposit transfers before processing approval events`
            );
        } else {
            for (const tx of res.rows) {
                depositTx.push(tx.tx_hash);
            }
        }
        let logsFiltered = [];
        for (let i = 0; i < logs.length; i++) {
            logsFiltered.push(logs[i].filter(
                (item) => !depositTx.includes(item.transactionHash)
            ));
        }

        return logsFiltered;
    } catch (err) {
        handleErr(
            `personalUtil->getApprovalEvents() [blocks: from ${fromBlock} to: ${toBlock}, account: ${account}]`,
            err
        );
        return false;
    }
};

export {
    getApprovalEvents,
}