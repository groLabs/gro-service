"use strict";
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const { handleErr, isDeposit, isPlural, getTransferEvents2, getGTokenFromTx, Transfer, transferType, } = require('../common/personalUtil');
const { parseTransferEvents, } = require('../parser/personalStatsParser');
const { QUERY_ERROR } = require('../constants');
/// @notice - Loads deposits/withdrawals into USER_STD_FACT_TRANSFERS
///         - Data is sourced from USER_STD_TMP_DEPOSITS & USER_STD_TMP_TRANSACTIONS (full load w/o filters)
///         - All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         - Load date is stored into SYS_USER_LOADS
/// @param  fromDate Start date to load transfers
/// @param  toDdate End date to load transfers
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserTransfers = async (fromDate, toDate, account) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserTransfers', account)) {
            // Insert deposits, withdrawals & transfers
            const q = (account)
                ? 'insert_user_cache_fact_transfers.sql'
                : 'insert_user_std_fact_transfers.sql';
            const params = (account)
                ? [account]
                : [];
            const res = await query(q, params);
            if (res.status === QUERY_ERROR)
                return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB${account ? ' CACHE' : ''}: ${numTransfers} record${isPlural(numTransfers)} added into USER_STD_FACT_TRANSFERS`);
        }
        else {
            return false;
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        }
        else {
            const res = await loadTableUpdates('USER_STD_FACT_TRANSFERS', fromDate, toDate);
            return (res) ? true : false;
        }
    }
    catch (err) {
        handleErr('loadUserTransfers->loadUserTransfers()', err);
        return false;
    }
};
//TBR
/// @notice - Loads deposits, withdrawals & transfers into temporary tables
///         - Gtoken amount is retrieved from its related transaction
///         - Rest of data is retrieved from related event
/// @dev    - Truncates always temporary tables beforehand even if no data to be processed, 
///         otherwise, old data would be loaded if no new deposits/withdrawals
/// @param fromBlock Starting block to search for events
/// @param toBlock Ending block to search for events
/// @param side Load type:
///         - deposits: Transfer.Deposit
///         - withdrawals: Transfer.Withdraw
///
///
///
///
///
///
/// @param account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadTmpUserTransfers = async (fromBlock, toBlock, side, account) => {
    try {
        const logs = await getTransferEvents2(side, fromBlock, toBlock, account);
        if (logs && logs.length > 0) {
            // Store data into table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
            let finalResult = [];
            for (let i = 0; i < logs.length; i++) {
                // if (logs.length > 0) {
                const preResult = await parseTransferEvents(logs[i], side);
                // No need to retrieve Gtoken amounts from tx for direct transfers between users
                if (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) {
                    finalResult = await getGTokenFromTx(preResult, side, account);
                }
                else {
                    finalResult = preResult;
                }
                //await getPwrdValue(finalResult);
                let params = [];
                for (const item of finalResult)
                    params.push(Object.values(item));
                const [res, rows] = await query((isDeposit(side))
                    ? (account)
                        ? 'insert_user_cache_tmp_deposits.sql'
                        : 'insert_user_std_tmp_deposits.sql'
                    : (account)
                        ? 'insert_user_cache_tmp_withdrawals.sql'
                        : 'insert_user_std_tmp_withdrawals.sql', params);
                if (!res)
                    return false;
                logger.info(`**DB${(account) ? ' CACHE' : ''}: ${rows} ${transferType(side)}${isPlural(rows)} added into ${(isDeposit(side))
                    ? (account)
                        ? 'USER_CACHE_TMP_DEPOSITS'
                        : 'USER_STD_TMP_DEPOSITS'
                    : (account)
                        ? 'USER_CACHE_TMP_WITHDRAWALS'
                        : 'USER_STD_TMP_WITHDRAWALS'}`);
            }
        }
        else {
            logger.info(`**DB${(account) ? ' CACHE' : ''}: No ${transferType(side)}s found`);
        }
        return true;
    }
    catch (err) {
        const params = `[blocks from: ${fromBlock} to ${toBlock}, side: ${side}, account: ${account}]`;
        handleErr(`loadUserTransfers->loadTmpUserTransfers(): ${params} `, err);
        return false;
    }
};
module.exports = {
    loadTmpUserTransfers,
    loadUserTransfers,
};