const ethers = require('ethers');
const { query } = require('../handler/queryHandler');
const { getPersonalStats } = require('../handler/personalStatsHandler');
const { getDefaultProvider } = require('../../common/chainUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { findBlockByDate } = require('../common/globalUtil');
const {
    generateDateRange,
    handleErr,
    isPlural,
    Transfer,
    transferType,
} = require('../common/personalUtil');
const {
    parseAmount,
    parseApprovalEvents,
    parseTransferEvents,
} = require('../parser/personalStatsParser');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    loadUserTransfers,
    loadTmpUserTransfers,
} = require('./loadUserTransfers.js');
const {
    loadUserApprovals,
    loadTmpUserApprovals,
} = require('./loadUserApprovals.js');
const { loadUserBalances } = require('./loadUserBalances');
const { loadUserNetReturns } = require('./loadUserNetReturns');
const { loadGroStats } = require('./loadGroStats');
const { QUERY_ERROR } = require('../constants');

/// @notice Truncates temporaty tables & calculates blocks and dates to be processed
/// @param fromDate Start date to process data
/// @param toDdate End date to process data
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Truncate temporary tables
        const res = await Promise.all([
            query('truncate_tmp_user_approvals.sql', []),
            query('truncate_tmp_user_deposits.sql', []),
            query('truncate_tmp_user_withdrawals.sql', []),
        ]);

        if (
            res[0].status === QUERY_ERROR ||
            res[1].status === QUERY_ERROR ||
            res[2].status === QUERY_ERROR
        )
            return;

        // Calculate dates & blocks to process
        const dates = generateDateRange(_fromDate, _toDate);
        const fromDate = dates[0].clone();
        const toDate = dates[dates.length - 1]
            .utc()
            .clone()
            .add(23, 'hours')
            .add(59, 'seconds')
            .add(59, 'minutes');
        const fromBlock = (await findBlockByDate(fromDate, true)).block;
        const toBlock = (await findBlockByDate(toDate, false)).block;

        return [fromBlock, toBlock, dates];
    } catch (err) {
        handleErr(
            `loadPersonalStats->preload() [from: ${_fromDate}, to: ${_toDate}]`,
            err
        );
        return [];
    }
};

/// @notice Deletes transfers, approvals, balances and net returns for the given dates interval
/// @param fromDate Start date to delete data
/// @param toDdate End date to delete data
/// @return True if no exceptions found, false otherwise
const remove = async (fromDate, toDate) => {
    try {
        /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
        const fromDateParsed = moment(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = moment(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        const [transfers, balances, netReturns, approvals, loads] =
            await Promise.all([
                query('delete_user_transfers.sql', params),
                query('delete_user_balances.sql', params),
                query('delete_user_net_returns.sql', params),
                query('delete_user_approvals.sql', params),
                query('delete_table_loads.sql', params),
            ]);

        if (transfers && balances && netReturns && approvals && loads) {
            logger.info(
                `**DB: ${transfers.rowCount} record${isPlural(
                    transfers.rowCount
                )} deleted from USER_TRANSFERS`
            );
            logger.info(
                `**DB: ${balances.rowCount} record${isPlural(
                    balances.rowCount
                )} deleted from USER_BALANCES`
            );
            logger.info(
                `**DB: ${netReturns.rowCount} record${isPlural(
                    netReturns.rowCount
                )} deleted from USER_NET_RETURNS`
            );
            logger.info(
                `**DB: ${approvals.rowCount} record${isPlural(
                    approvals.rowCount
                )} deleted from USER_APPROVALS`
            );
            logger.info(
                `**DB: ${loads.rowCount} record${isPlural(
                    loads.rowCount
                )} deleted from SYS_TABLE_LOADS`
            );
        } else {
            const params = `Dates [${fromDate} - ${toDate}]`;
            handleErr(
                `loadPersonalStats->remove() Delete query didn't return results. Params: ${params}`,
                null
            );
            return false;
        }
        return true;
    } catch (err) {
        handleErr(
            `loadPersonalStats->remove() [from: ${fromDate}, to: ${toDate}]`,
            err
        );
        return false;
    }
};

// TODO (specially for mainnet)
const reloadApprovals = async () => { };

/// @notice Reloads user transfers, balances & net results for a given time interval
/// @dev    - Previous data for the given time interval will be overwritten
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const reload = async (fromDate, toDate) => {
    try {
        // Truncates TMP tables and calculates dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(fromDate, toDate);

        // Reload transfers, balances & net results
        if (fromBlock > 0 && toBlock > 0 && dates) {
            const res = await Promise.all([
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT, null),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL, null),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL, null),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT, null),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL, null),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT, null),
            ]);

            if (res.every(Boolean)) {
                if (await loadTmpUserApprovals(fromBlock, toBlock, null))
                    if (await remove(fromDate, toDate))
                        if (await loadUserTransfers(fromDate, toDate, null))
                            if (await loadUserApprovals(fromDate, toDate, null))
                                if (await loadUserBalances(fromDate, toDate, null))
                                    await loadUserNetReturns(fromDate, toDate, null);
            } else {
                logger.warn(
                    `**DB: Error/s found in loadPersonalStats.js->reload()`
                );
            }
        } else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            handleErr(
                `loadPersonalStats->reload() Error with parameters: ${params}`,
                null
            );
        }
    } catch (err) {
        handleErr(
            `loadPersonalStats->reload() [from: ${fromDate}, to: ${toDate}]`,
            err
        );
    }
};

/// @notice Loads user transfers, balances & net results for a given time interval
/// @dev    - If previous data was loaded for the same interval, there will be errors
///         referring to duplicated primary key
///         - If any data load fails, execution is stopped (to avoid data inconsistency)
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const load = async (fromDate, toDate) => {
    // Truncates TMP tables and calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate);

    // Reload transfers, balances & net results
    if (fromBlock > 0 && toBlock > 0) {
        const res = await Promise.all([
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT, null),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL, null),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL, null),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT, null),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL, null),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT, null),
        ]);

        if (res.every(Boolean)) {
            if (await loadTmpUserApprovals(fromBlock, toBlock, null))
                if (await loadUserTransfers(fromDate, toDate, null))
                    if (await loadUserApprovals(fromDate, toDate, null))
                        if (await loadUserBalances(fromDate, toDate, null))
                            await loadUserNetReturns(fromDate, toDate, null);
        } else {
            logger.warn(`**DB: Error/s found in loadPersonalStats.js->load()`);
        }
    } else {
        const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
        handleErr(
            `loadPersonalStats->load() Error with parameters: ${params}`,
            null
        );
    }
};

const loadPersonalStats = async () => {
    try {
        console.log('in loadPersonalStats');

        //DEV Ropsten:
        // await reload('28/06/2021', '28/06/2021');
        await reload('16/08/2021', '16/08/2021');
        //await load('30/06/2021', '30/06/2021');

        // PROD:
        // await reload("02/07/2021", "04/07/2021");

        // Personal Stats
        // const res = await getPersonalStats('06/07/2021', '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
        // console.log(res);

        // process.exit();
        console.log('here3');
    } catch (err) {
        handleErr(`loadPersonalStats->loadPersonalStats()`, err);
    }
};

module.exports = {
    loadPersonalStats,
};
