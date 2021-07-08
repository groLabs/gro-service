const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    QUERY_ERROR,
    handleErr,
    isDeposit,
    isPlural,
    getTransferEvents2,
    getGTokenFromTx,
    Transfer,
    transferType,
} = require('../common/personalUtil');
const {
    parseTransferEvents,
} = require('../common/personalParser');


/// @notice Loads deposits/withdrawals into USER_TRANSFERS
///         Data is sourced from TMP_USER_DEPOSITS & TMP_USER_TRANSACTIONS (full load w/o filters)
///         All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         Latest block & time processed are stored into SYS_TABLE_LOADS
/// @return True if no exceptions found, false otherwise
const loadUserTransfers = async (fromDate, toDate) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserTransfers')) {
            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const res = await query('insert_user_transfers.sql', []);
            if (res === QUERY_ERROR) return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB: ${numTransfers} record${isPlural(numTransfers)} added into USER_TRANSFERS`);
        } else {
            return false;
        }
        const res = await loadTableUpdates('USER_TRANSFERS', fromDate, toDate);
        return (res) ? true : false;
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
        return false;
    }
}

/// @notice - Loads deposits/withdrawals from all user accounts into temporary tables
///         - Gtoken amount is retrieved from related transaction
///         - Rest of data is retrieved from related event (LogNewDeposit or LogNewWithdrawal)
/// @dev - Truncates always temporary tables beforehand even if no data to be processed, 
///        otherwise, old data would be loaded if no new deposits/withdrawals
/// @param fromBlock Starting block to search for events
/// @param toBlock Ending block to search for events
/// @param side Load deposits ('Transfer.Deposit') or withdrawals ('Transfer.Withdraw')
/// @return True if no exceptions found, false otherwise
const loadTmpUserTransfers = async (
    fromBlock,
    toBlock,
    side,
) => {
    try {
        const logs = await getTransferEvents2(side, fromBlock, toBlock, null);
        if (logs) {
            // Store data into table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
            let finalResult = [];
            if (logs.length > 0) {
                const preResult = await parseTransferEvents(logs, side);
                // No need to retrieve Gtoken amounts from tx for direct transfers between users
                if (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) {
                    finalResult = await getGTokenFromTx(preResult, side);
                } else {
                    finalResult = preResult;
                }
                //await getPwrdValue(finalResult);
                let params = [];
                for (const item of finalResult)
                    params.push(Object.values(item));
                const [res, rows] = await query(
                    (isDeposit(side))
                        ? 'insert_tmp_user_deposits.sql'
                        : 'insert_tmp_user_withdrawals.sql'
                    , params);
                if (!res) return false;
                logger.info(`**DB: ${rows} ${transferType(side)}${isPlural(rows)} added into ${(isDeposit(side))
                    ? 'TMP_USER_DEPOSITS'
                    : 'TMP_USER_WITHDRAWALS'
                    }`);
            } else {
                logger.info(`**DB: No ${transferType(side)}s found`);
            }
        }
        return true;
    } catch (err) {
        //handleErr(`personalHandler->loadTmpUserTransfers() [blocks from: ${fromBlock} to ${toBlock}, side: ${side}]`, err);
        console.log(err)
        return false;
    }
}

module.exports = {
    loadTmpUserTransfers,
    loadUserTransfers,
};
