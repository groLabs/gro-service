const ethers = require('ethers');
const { query } = require('../handler/queryHandler');
const { getPersonalStats } = require('../handler/personalStatsHandler');
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
const { loadEthBlocks } = require('../loader/loadEthBlocks');
const { loadTableUpdates } = require('../loader/loadTableUpdates');
const {
    loadUserTransfers,
    loadTmpUserTransfers,
} = require('../loader/loadUserTransfers');
const {
    loadUserApprovals,
    loadTmpUserApprovals,
} = require('../loader/loadUserApprovals');
// const { loadUserBalances } = require('../loader/loadUserBalances');
const { loadUserBalances2 } = require('../loader/loadUserBalances2');
const { loadTokenPrice } = require('../loader/loadTokenPrice');
const { loadUserNetReturns } = require('../loader/loadUserNetReturns');
const { checkDateRange } = require('../common/globalUtil');
const { QUERY_ERROR } = require('../constants');

/// @notice Truncate temporary tables & calculate blocks and dates to be processed
/// @param fromDate Start date to process data [format: 'DD/MM/YYYY']
/// @param toDdate End date to process data [format: 'DD/MM/YYYY']
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Truncate temporary tables
        const res = await Promise.all([
            query('truncate_user_std_tmp_approvals.sql', []),
            query('truncate_user_std_tmp_deposits.sql', []),
            query('truncate_user_std_tmp_withdrawals.sql', []),
        ]);

        if (
            res[0].status === QUERY_ERROR ||
            res[1].status === QUERY_ERROR ||
            res[2].status === QUERY_ERROR
        )
            return;

        // Calculate dates & blocks to be processed
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
            `etlPersonalStats->preload() [from: ${_fromDate}, to: ${_toDate}]`,
            err
        );
        return [];
    }
};

/// @notice Delete transfers, approvals, balances, net returns & prices for a given time interval
/// @dev    Date format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
/// @param  fromDate Start date to delete data
/// @param  toDdate End date to delete data
/// @return True if no exceptions found; false otherwise
const remove = async (fromDate, toDate) => {
    try {
        
        const fromDateParsed = moment(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = moment(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        const [
                transfers,
                // balances,
                balancesStaked,
                balancesUnstaked,
                balancesPooled,
                netReturns,
                netReturnsUnstaked,
                approvals,
                loads,
                price
            ] = await Promise.all([
                query('delete_user_std_fact_transfers.sql', params),
                // query('delete_user_std_fact_balances.sql', params),
                query('delete_user_std_fact_balances_unstaked.sql', params),
                query('delete_user_std_fact_balances_staked.sql', params),
                query('delete_user_std_fact_balances_pooled.sql', params),
                query('delete_user_std_fact_net_returns.sql', params),
                query('delete_user_std_fact_net_returns_unstaked.sql', params),
                query('delete_user_std_fact_approvals.sql', params),
                query('delete_table_loads.sql', params),
                query('delete_token_price.sql', params),
            ]);

        if (transfers && 
            /*balances*/
            balancesStaked && 
            balancesUnstaked && 
            balancesPooled && 
            netReturns &&
            netReturnsUnstaked &&
            approvals &&
            loads &&
            price) {
            logger.info(
                `**DB: ${transfers.rowCount} record${isPlural(
                    transfers.rowCount
                )} deleted from USER_STD_FACT_TRANSFERS`
            );
            // logger.info(
            //     `**DB: ${balances.rowCount} record${isPlural(
            //         balances.rowCount
            //     )} deleted from USER_STD_FACT_BALANCES`
            // );
            logger.info(
                `**DB: ${balancesStaked.rowCount} record${isPlural(
                    balancesStaked.rowCount
                )} deleted from USER_STD_FACT_BALANCES_STAKED`
            );
            logger.info(
                `**DB: ${balancesUnstaked.rowCount} record${isPlural(
                    balancesUnstaked.rowCount
                )} deleted from USER_STD_FACT_BALANCES_UNSTAKED`
            );
            logger.info(
                `**DB: ${balancesPooled.rowCount} record${isPlural(
                    balancesPooled.rowCount
                )} deleted from USER_STD_FACT_BALANCES_POOLED`
            );
            logger.info(
                `**DB: ${netReturns.rowCount} record${isPlural(
                    netReturns.rowCount
                )} deleted from USER_STD_FACT_NET_RETURNS`
            );
            logger.info(
                `**DB: ${netReturnsUnstaked.rowCount} record${isPlural(
                    netReturnsUnstaked.rowCount
                )} deleted from USER_STD_FACT_NET_RETURNS_UNSTAKED`
            );
            logger.info(
                `**DB: ${approvals.rowCount} record${isPlural(
                    approvals.rowCount
                )} deleted from USER_APPROVALS`
            );
            logger.info(
                `**DB: ${loads.rowCount} record${isPlural(
                    loads.rowCount
                )} deleted from SYS_USER_LOADS`
            );
            logger.info(
                `**DB: ${price.rowCount} record${isPlural(
                    price.rowCount
                )} deleted from TOKEN_PRICE`
            );
        } else {
            const params = `Dates [${fromDate} - ${toDate}]`;
            handleErr(
                `etlPersonalStats->remove() Delete query didn't return data. Params: ${params}`,
                null
            );
            return false;
        }
        return true;
    } catch (err) {
        handleErr(
            `etlPersonalStats->remove() [from: ${fromDate}, to: ${toDate}]`,
            err
        );
        return false;
    }
};

// TODO (specially for mainnet)
const reloadApprovals = async () => { };

/// @notice Reload user transfers, balances, net returns & prices for a given time interval
/// @dev    - Previous data for the given time interval will be removed
///         - If any data load fails, execution is stopped (to avoid data inconsistency)
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const reload = async (fromDate, toDate) => {
    try {
        // Truncate temporary tables and calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(fromDate, toDate);

        // Reload transfers, balances, net returns & prices
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
                // if (await loadTmpUserApprovals(fromBlock, toBlock, null))
                if (await remove(fromDate, toDate))
                    if (await loadUserTransfers(fromDate, toDate, null))
                        // if (await loadUserApprovals(fromDate, toDate, null))
                        // if (await loadUserBalances(fromDate, toDate, null))
                        if (await loadUserBalances2(fromDate, toDate, null, null)) {
                            await loadTokenPrice(fromDate, toDate);
                            await loadUserNetReturns(fromDate, toDate, null);
                            return true;
                        }
            } else {
                logger.warn(`**DB: Error/s found in etlPersonalStats.js->reload()`);
            }
        } else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            handleErr(`etlPersonalStats->reload() Error with parameters: ${params}`, null);
        }
        return false;
    } catch (err) {
        handleErr(`etlPersonalStats->reload() [from: ${fromDate}, to: ${toDate}]`, err);
    }
};

/// @notice Load user transfers, balances, net returns & prices for a given time interval
/// @dev    - If previous data was loaded for the same interval, there will be errors
///         referring to duplicated primary key
///         - If any data load fails, execution is stopped (to avoid data inconsistency)
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const load = async (fromDate, toDate) => {
    // Truncates TMP tables and calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate);

    // Reload transfers, balances & net returns
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
                        // if (await loadUserBalances(fromDate, toDate, null))
                        if (await loadUserBalances2(fromDate, toDate, null, null)) {
                            await loadTokenPrice(fromDate, toDate);
                            await loadUserNetReturns(fromDate, toDate, null);
                            return true;
                        }
        } else {
            logger.warn(`**DB: Error/s found in etlPersonalStats.js->load()`);
        }
    } else {
        const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
        handleErr(`etlPersonalStats->load() Error with parameters: ${params}`, null);
    }
    return false;
};

const etlPersonalStats = async (fromDate, toDate) => {
    try {
        if (checkDateRange(fromDate, toDate)) {
            const res = await reload(fromDate, toDate);
            if (res) {
                logger.info(`**DB: Personal stats load from ${fromDate} to ${toDate} is completed ;)`);
            } else {
                logger.error(`**DB: Personal stats load from ${fromDate} to ${toDate} is NOT completed :/`);
            } 
        }
    } catch (err) {
        handleErr(`etlPersonalStats->etlPersonalStats()`, err);
    }
};

module.exports = {
    etlPersonalStats,
};
