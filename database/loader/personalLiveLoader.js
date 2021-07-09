const moment = require('moment');
const { query } = require('../handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { getTimestampByBlockNumber } = require('../../common/chainUtil');
const {
    initDatabaseContracts,
    initAllContracts,
    getGvt,
    getPwrd,
    // getBuoy,
    // getDepositHandler,
    //getVaultStabeCoins,
} = require('../../contract/allContracts');
const {
    QUERY_ERROR,
    getBlockData,
    getNetworkId,
    getStableCoinIndex,
    generateDateRange,
    getApprovalEvents2,
    getTransferEvents2,
    getGTokenFromTx,
    handleErr,
    isDeposit,
    isPlural,
    Transfer,
    transferType,
    findBlockByDate,
} = require('../common/personalUtil');
const {
    parseAmount,
    parseApprovalEvents,
    parseTransferEvents,
} = require('../common/personalParser');


/// @notice Adds new blocks into table ETH_BLOCKS
/// @return True if no exceptions found, false otherwise
const loadEthBlocks2 = async (func) => {
    try {
        // Get block numbers to be processed from temporary tables on deposits & withdrawals
        const q = (func === 'loadUserTransfers')
            ? 'select_cache_distinct_blocks_tmp_transfers.sql'
            : 'select_cache_distinct_blocks_tmp_approvals.sql';
        const blocks = await query(q, []);
        if (blocks === QUERY_ERROR) return false;

        // Insert new blocks into ETH_BLOCKS
        const numBlocks = blocks.rowCount;
        if (numBlocks > 0) {
            logger.info(`**DB CACHE: Processing ${numBlocks} block${isPlural(numBlocks)} from ${(func === 'loadUserTransfers')
                ? 'transfers'
                : 'approvals'
                }...`);
            for (const item of blocks.rows) {
                const block = await getBlockData(item.block_number);
                const params = [
                    block.number,
                    block.timestamp,
                    moment.unix(block.timestamp),
                    getNetworkId(),
                    moment.utc()];
                const result = await query('insert_eth_blocks.sql', params);
                if (result === QUERY_ERROR)
                    return false;
            }
            logger.info(`**DB CACHE: ${numBlocks} block${isPlural(numBlocks)} added into ETH_BLOCKS`);
        } else {
            logger.info(`**DB CACHE: No blocks to be added from ${(func === 'loadUserTransfers')
                ? 'transfers'
                : 'approvals'
                }`);
        }
        return true;
    } catch (err) {
        handleErr('personalHandler->loadEthBlocks()', err);
        return false;
    }
}


/// @notice Loads net results into USER_NET_RETURNS
/// @dev Data sourced from USER_DEPOSITS & USER_TRANSACTIONS (full load w/o filters)
/// @param fromDate Start date to load net results
/// @param toDdate End date to load net results
const loadUserNetReturns2 = async (
    fromDate,
    toDate,
    account,
) => {
    try {
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB CACHE: Processing user net result/s...`);
        for (const date of dates) {
            /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
            //const day = moment(date).format('MM/DD/YYYY');
            //const result = await query('insert_user_net_returns.sql', [day]);
            const result = await query('insert_cache_user_net_returns.sql', [account]);
            if (result === QUERY_ERROR) return false;
            const numResults = result.rowCount;
            let msg = `**DB CACHE: ${numResults} record${isPlural(numResults)} added into `;
            msg += `USER_NET_RETURNS for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        // await updateTableLoads('USER_NET_RETURNS', fromDate, toDate);
    } catch (err) {
        handleErr(`personalHandler->loadUserNetReturns() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}


/// @notice Loads balances into USER_BALANCES
/// @dev Data is sourced from smart contract calls to user's balances at a certain block number
///      according to the dates provided
/// @param fromDate Start date to load balances
/// @param toDdate End date to load balances
/// @return True if no exceptions found, false otherwise
const loadUserBalances2 = async (
    fromDate,
    toDate,
    account,
) => {
    try {
        // Get users with any transfer
        let users;
        if (account) {
            users = {
                rowCount: 1,
                rows: [{
                    user_address: account
                }],
            }
        } else {
            users = await query('select_distinct_users_transfers.sql', []);
            if (users === QUERY_ERROR)
                return false;
        }
        // const users = await query('select_distinct_users_transfers.sql', []);
        // if (users === QUERY_ERROR) return false;
        // console.log(users);

        // For each date, check gvt & pwrd balance and insert data into USER_BALANCES
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB CACHE: Processing ${users.rowCount} user balance${isPlural(users.rowCount)}...`);
        for (const date of dates) {
            const day = moment.utc(date, "DD/MM/YYYY")
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');
            const blockTag = {
                blockTag: (await findBlockByDate(day)).block
            }
            let rowCount = 0;
            for (const user of users.rows) {
                const account = user.user_address;
                const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
                const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
                const totalValue = gvtValue + pwrdValue;
                const params = [
                    day,
                    getNetworkId(),
                    account,
                    totalValue,
                    gvtValue,
                    pwrdValue,
                    moment.utc()
                ];
                // TODO: if wrong name in the query?
                const result = await query('insert_cache_user_balances.sql', params);
                if (result === QUERY_ERROR) return false;
                rowCount += result.rowCount;
            }
            let msg = `**DB CACHE: ${rowCount} record${isPlural(rowCount)} added into `;
            msg += `USER_BALANCES for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        // const res = await updateTableLoads('USER_BALANCES', fromDate, toDate);
        // return (res) ? true : false;
        return true;
    } catch (err) {
        handleErr(`personalHandler->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

const loadUserApprovals2 = async (account) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks2('loadUserApprovals')) {
            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const res = await query('insert_cache_user_approvals.sql', [account]);
            if (res === QUERY_ERROR) return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB CACHE: ${numTransfers} record${isPlural(numTransfers)} added into USER_APPROVALS`);
            return true;
        } else {
            return false;
        }
        // const res = await updateTableLoads('USER_APPROVALS', fromDate, toDate);
        // return (res) ? true : false;
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
        return false;
    }
}

/// @notice Loads deposits/withdrawals into USER_TRANSFERS
///         Data is sourced from TMP_USER_DEPOSITS & TMP_USER_TRANSACTIONS (full load w/o filters)
///         All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         Latest block & time processed are stored into SYS_TABLE_LOADS
/// @return True if no exceptions found, false otherwise
const loadUserTransfers2 = async (account) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks2('loadUserTransfers')) {
            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const res = await query('insert_cache_user_transfers.sql', [account]);
            if (res === QUERY_ERROR) return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB CACHE: ${numTransfers} record${isPlural(numTransfers)} added into USER_TRANSFERS`);
            return true;
        } else {
            return false;
        }
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
        return false;
    }
}

const loadTempUserApprovals = async (
    fromBlock,
    toBlock,
    account,
) => {
    try {
        // Get all approval events for a given block range
        const logs = await getApprovalEvents2(account, fromBlock, toBlock);
        if (!logs)
            return false;

        // Parse approval events
        logger.info(`**DB CACHE: Processing ${logs.length} approval event${isPlural(logs.length)}...`);
        const approvals = await parseApprovalEvents(logs);

        // Insert approvals into USER_APPROVALS
        // TODO: returning different types will be a problem in TS
        if (approvals)
            for (const item of approvals) {
                const params = (Object.values(item));
                const res = await query('insert_cache_tmp_user_approvals.sql', params);
                if (res === QUERY_ERROR) return false;
            }
        // TODO: missing N records added into table X
        return true;
    } catch (err) {
        handleErr(`personalHandler->loadTmpUserApprovals() [blocks: ${fromBlock} to: ${toBlock}]`, err);
        return false;
    }
}

const loadTempUserTransfers = async (
    fromBlock,
    toBlock = 'latest',
    side,
    account
) => {
    try {
        const logs = await getTransferEvents2(side, fromBlock, toBlock, account);
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
                let params = [];
                for (const item of finalResult)
                    params.push(Object.values(item));
                const [res, rows] = await query(
                    (isDeposit(side))
                        ? 'insert_cache_tmp_user_deposits.sql'
                        : 'insert_cache_tmp_user_withdrawals.sql'
                    , params);
                if (!res) return false;
                logger.info(`**DB CACHE: ${rows} ${transferType(side)}${isPlural(rows)} added into ${(isDeposit(side))
                    ? 'CACHE_TMP_USER_DEPOSITS'
                    : 'CACHE_TMP_USER_WITHDRAWALS'
                    }`);
            }
        } else {
            logger.info(`**DB CACHE: 0 ${transferType(side)}} added into ${(isDeposit(side))
                ? 'CACHE_TMP_USER_DEPOSITS'
                : 'CACHE_TMP_USER_WITHDRAWALS'
                }`);
        }
        return true;
    } catch (err) {
        //handleErr(`personalHandler->loadTmpUserTransfers() [blocks from: ${fromBlock} to ${toBlock}, side: ${side}]`, err);
        console.log(err)
        return false;
    }
}

/// @notice - Deletes all data in cache tables for a given user address
///         - Determines the starting date of cache load based on max date 
///           in USER_BALANCES for a given user address
/// @param account User address for whom cache load will be performed
/// @return Array with start block and last date to be processed
const preloadCache = async (account) => {
    try {
        const params = [account];
        const [
            tmpApprovals,
            tmpDeposits,
            tmpWithdrawals,
            approvals,
            balances,
            netReturns,
            transfers,
            _fromDate,
        ] = await Promise.all([
            query('delete_cache_tmp_user_approvals.sql', params),
            query('delete_cache_tmp_user_deposits.sql', params),
            query('delete_cache_tmp_user_withdrawals.sql', params),
            query('delete_cache_user_approvals.sql', params),
            query('delete_cache_user_balances.sql', params),
            query('delete_cache_user_net_returns.sql', params),
            query('delete_cache_user_transfers.sql', params),
            query('select_max_load_dates.sql', params),
        ]);

        if (tmpApprovals === QUERY_ERROR ||
            tmpDeposits === QUERY_ERROR ||
            tmpWithdrawals === QUERY_ERROR ||
            approvals === QUERY_ERROR ||
            balances === QUERY_ERROR ||
            netReturns === QUERY_ERROR ||
            transfers === QUERY_ERROR ||
            _fromDate === QUERY_ERROR)
            return [];

        // User has no balance yet in USER_BALANCES
        let fromDate;
        if (!_fromDate.rows[0].max_balance_date) {
            const launchBlock = getConfig('blockchain.start_block');
            const timestamp = await getTimestampByBlockNumber(launchBlock);
            fromDate = moment
                .unix(timestamp)
                .utc();
            // It should be enough by looking a couple of days ago, but for testing purposes,
            // we look at all events from the contracts creation
            // fromDate = moment
            //     .utc()
            //     .subtract(2, 'days');
        } else {
            fromDate = moment
                .utc(_fromDate.rows[0].max_balance_date)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .add(1, 'days');
        }
        
        // Calculate starting date, starting block and dates range to be processed
        // const fromDate = moment
        //     .utc(_fromDate.rows[0].max_balance_date)
        //     .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        //     .add(1, 'days');
        const fromBlock = (await findBlockByDate(fromDate)).block;
        const toDate = moment
            .utc()
            .format('DD/MM/YYYY');

        return [fromBlock, toDate];
    } catch (err) {
        handleErr(`personalLiveLoader->preload() [account: ${account}]`, err);
        return [];
    }
}

const loadCache = async (account) => {
    try {
        const [fromBlock, toDate] = await preloadCache(account);
        const fromDate = toDate;

        if (fromBlock > 0) {
            const [
                deposits,
                withdrawals,
                ext_gvt_deposit,
                ext_pwrd_deposit,
                ext_gvt_withdrawal,
                ext_pwrd_withdrawal,
            ] = await Promise.all([
                loadTempUserTransfers(fromBlock, null, Transfer.DEPOSIT, account),
                loadTempUserTransfers(fromBlock, null, Transfer.WITHDRAWAL, account),
                loadTempUserTransfers(fromBlock, null, Transfer.EXTERNAL_GVT_WITHDRAWAL, account),
                loadTempUserTransfers(fromBlock, null, Transfer.EXTERNAL_GVT_DEPOSIT, account),
                loadTempUserTransfers(fromBlock, null, Transfer.EXTERNAL_PWRD_WITHDRAWAL, account),
                loadTempUserTransfers(fromBlock, null, Transfer.EXTERNAL_PWRD_DEPOSIT, account),
            ]);
            if (deposits
                && withdrawals
                && ext_gvt_deposit
                && ext_pwrd_deposit
                && ext_gvt_withdrawal
                && ext_pwrd_withdrawal) {
                if (await loadTempUserApprovals(fromBlock, null, account))
                    if (await loadUserTransfers2(account))
                        if (await loadUserApprovals2(account))
                            if (await loadUserBalances2(fromDate, toDate, account))
                                await loadUserNetReturns2(fromDate, toDate, account);
                console.log('All loaded')
            }
        } else {
            const params = `user: ${account} fromBlock ${fromBlock}`;
            handleErr(`personalHandler->reload() Error with parameters: ${params}`, null);
        }
    } catch (err) {
        handleErr(`personalLiveLoader->load()`, err);
    }
}

const loadGroStatsLiveDB = async (account) => {
    try {
        initAllContracts().then(async () => {
            await loadCache(account);
            process.exit(); // for testing purposes
        });
        console.log('hey')
    } catch (err) {
        handleErr(`personalLiveLoader->loadGroStatsLiveDB()`, err);
    }
}

module.exports = {
    loadGroStatsLiveDB,
};