const ethers = require('ethers');
const { query } = require('./queryHandler');
const BN = require('bignumber.js');
const {
    initDatabaseContracts,
    getGvt,
    getPwrd
} = require('../../contract/allContracts');
const { getConfig } = require('../../common/configUtil');
const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const {
    EVENT_TYPE,
    getEvents,
} = require('../../common/logFilter');
const {
    getDefaultProvider,
    getAlchemyRpcProvider
} = require('../../common/chainUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const BlocksScanner = require('../../stats/common/blockscanner');

const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

// TODO: replace hardcoded strings by CONSTANTS
// TODO: parse float function
// TODO: all CONSTANTS in one file: /common/constants.js
const QUERY_ERROR = 400;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const Transfer = Object.freeze({ "DEPOSIT": 1, "WITHDRAWAL": 2 });


const parseAmount = (amount, coin) => {
    return parseFloat(div(
        amount,
        (coin === 'DAI' || coin === 'USD') ? BN(10).pow(18) : BN(10).pow(6),
        amountDecimal
    ));
}

// TODO start: to be included in /commmon/chainUtil.js
const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV) {
            case 'mainnet': return 1;
            case 'kovan': return 42;
            //case 'develop': return TBC;
        }
    } catch (err) {
        logger.error(err);
    }
}
// TODO end

const getBlockData = async (blockNumber) => {
    const block = await getDefaultProvider()
        .getBlock(blockNumber)
        .catch((err) => {
            logger.error(err);
        });
    return block;
}

const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
}

const loadEthBlocks = async (blocks) => {
    try {
        logger.info(`**DB: Processing ${blocks.length} blocks...`);
        for (const item of blocks) {
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
        logger.info(`**DB: ${blocks.length} block/s added into ETH_BLOCKS`);
        return true;
    } catch (err) {
        handleErr('personalHandler->loadEthBlocks()', err);
    }
}

// TODO start: to be moved to /common. 
// Files currently using findBlockByDate(): statsDBHandler.js, apyHandler.js and currentApyHandler.js
let scanner;
function updateBlocksScanner(newProvider) {
    scanner = new BlocksScanner(newProvider);
}
async function findBlockByDate(scanDate) {
    try {
        const blockFound = await scanner
            .getDate(scanDate.toDate())
            .catch((err) => {
                logger.error(err);
                logger.error(`Could not get block ${scanDate}`);
            });
        return blockFound;
    } catch (err) {
        console.log(err);
    }
}
// TODO end: to be moved to /common. 

const updateLastTableLoad = async (table, last_block, last_date) => {
    try {
        const params = [
            table,
            last_block,
            last_date,
            getNetworkId(),
            moment.utc()];
        const result = await query('update_sys_table_loads.sql', params);
        return (result !== QUERY_ERROR) ? true : false;
    } catch (err) {
        handleErr(`personalHandler->updateLastTableLoad() [table: ${table}, last_block: ${last_block}, last_date: ${last_date}]`, err);
        return false;
    }
}

const getGTokenFromTx = async (result, transfer) => {
    try {
        logger.info(`**DB: Processing ${result.length} ${(transfer === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal'} transaction/s...`);
        // Interface for ERC20 token transfer
        const iface = new ethers.utils.Interface([
            "event Transfer(address indexed from, address indexed to, uint256 amount)",
        ]);

        // For all transactions -> for all logs -> retrieve GToken
        for (const item of result) {
            const txReceipt = await getDefaultProvider()
                .getTransactionReceipt(item.tx_hash)
                .catch((err) => {
                    console.log(err);
                });
            for (const log of txReceipt.logs) {
                // Only when signature is an ERC20 transfer: `Transfer(address from, address to, uint256 value)`
                if (log.topics[0] === ERC20_TRANSFER_SIGNATURE) {
                    const index = (transfer === Transfer.DEPOSIT) ? 1 : 2; // from is 0x0 : to is 0x0
                    // Only when a token is minted (from: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });
                        // Update result array with the correct GTokens
                        if (item.gvt_amount !== 0) {
                            item.gvt_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.gvt_amount = (transfer === Transfer.DEPOSIT) ? item.gvt_amount : -item.gvt_amount
                        } else {
                            item.pwrd_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.pwrd_amount = (transfer === Transfer.DEPOSIT) ? item.pwrd_amount : -item.pwrd_amount
                        }
                    }
                }
            };
        };
        logger.info(`**DB: ${result.length} transaction/s processed.`);
        return result;
    } catch (err) {
        handleErr(`personalHandler->getGTokenFromTx() [transfer: ${transfer}]`, err);
    }
};

const parseDataFromEvent = async (logs, side) => {
    try {
        let result = [];
        logs.forEach((log) => {
            const dai_amount = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[4][0], 'DAI')
                : - parseAmount(log.args[8][0], 'DAI');
            const usdc_amount = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[4][1], 'USDC')
                : - parseAmount(log.args[8][1], 'USDC');
            const usdt_amount = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[4][2], 'USDT')
                : - parseAmount(log.args[8][2], 'USDT');
            const usd_deduct = (side === Transfer.DEPOSIT) ? 0 : - parseAmount(log.args[5], 'USD');
            const usd_return = (side === Transfer.DEPOSIT) ? 0 : - parseAmount(log.args[6], 'USD');
            const lp_amount = (side === Transfer.DEPOSIT) ? 0 : - parseAmount(log.args[7], 'USD');
            const usd_value = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[3], 'USD')
                : usd_return;
            result.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: getNetworkId(),
                user_address: log.args[0],
                referral_address: log.args[1],
                usd_value: usd_value,
                gvt_value: (log.args[2]) ? 0 : usd_value,
                pwrd_value: (log.args[2]) ? usd_value : 0,
                usd_amount: dai_amount + usdc_amount + usdt_amount,
                gvt_amount: (log.args[2]) ? 0 : 1,  // calculated afterwards
                pwrd_amount: (log.args[2]) ? 1 : 0, // calculated afterwards
                dai_amount: dai_amount,
                usdc_amount: usdc_amount,
                usdt_amount: usdt_amount,
                creation_date: moment.utc(),
                ...(side === Transfer.WITHDRAWAL) && { usd_deduct: usd_deduct },
                ...(side === Transfer.WITHDRAWAL) && { usd_return: usd_return },
                ...(side === Transfer.WITHDRAWAL) && { lp_amount: lp_amount },
            });
        });
        return result;
    } catch (err) {
        handleErr(`personalHandler->parseDataFromEvent() [side: ${side}]`, err);
    }
}

/// @notice - Loads deposits/withdrawals from all user accounts into temporary tables
///         - Gtoken amount is retrieved from related transaction
///         - Rest of data is retrieved from related event (LogNewDeposit or LogNewWithdrawal)
/// @dev    - Truncates always temporary tables beforehand even if no data to be processed, 
///           otherwise, old data would be loaded if no new deposits/withdrawals
/// @param fromBlock Starting block to search for events
/// @param toBlock Ending block to search for events
/// @param side Load deposits ('Transfer.Deposit') or withdrawals ('Transfer.Withdraw')
/// @param account User account to be processed - if null, all accounts to be processed
const loadTmpUserTransfers = async (
    fromBlock,
    toBlock,
    side,
    account = null
) => {
    try {
        // Get all deposit or withdrawal events for a given block range
        const logs = await getEvents(
            (side === Transfer.DEPOSIT)
                ? EVENT_TYPE.deposit
                : EVENT_TYPE.withdraw,
            fromBlock,
            toBlock,
            account,
        ).catch((err) => {
            logger.error(err);
        });

        // Truncate table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
        const res = await query((side === Transfer.DEPOSIT) ? 'truncate_tmp_user_deposits.sql' : 'truncate_tmp_user_withdrawals.sql', []);
        if (res === QUERY_ERROR) return false;

        let finalResult = [];
        if (logs.length > 0) {
            // Parse relevant data from each event
            const preResult = await parseDataFromEvent(logs, side);

            // Get Gtoken amount from each transaction linked to the previous events 
            // and update gvt_amount & pwrd_amount
            finalResult = await getGTokenFromTx(preResult, side);

            // Store data into table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
            let params = [];
            for (const item of finalResult)
                params.push(Object.values(item));
            const rows = await query((side === Transfer.DEPOSIT) ? 'insert_tmp_user_deposits.sql' : 'insert_tmp_user_withdrawals.sql', params);

            logger.info(`**DB: ${rows} record/s added into ${(side === Transfer.DEPOSIT) ? 'TMP_USER_DEPOSITS' : 'TMP_USER_WITHDRAWALS'}`);
        } else {
            logger.info(`**DB: No moar ${(side === Transfer.DEPOSIT) ? 'deposits' : 'withdrawals'} to be processed.`);
            return true;
        }

        // Store latest block processed into table SYS_TABLE_LOADS
        const lastBlock = finalResult[finalResult.length - 1].block_number;
        const result = await updateLastTableLoad(
            (side === Transfer.DEPOSIT) ? 'TMP_USER_DEPOSITS' : 'TMP_USER_WITHDRAWALS',
            lastBlock,
            moment.unix((await getBlockData(lastBlock)).timestamp),
        );

        return (result) ? true : false;

    } catch (err) {
        handleErr(`personalHandler->loadTmpUserTransfers() [blocks from: ${fromBlock} to ${toBlock}, side: ${side}, account: ${account}]`, err);
        return false;
    }
}

/// @notice Load deposits/withdrawals into USER_TRANSFERS
///         Data sourced from TMP_USER_DEPOSITS & TMP_USER_TRANSACTIONS (full load w/o filters)
///         All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         Latest block & time processed are stored into SYS_TABLE_LOADS
const loadUserTransfers = async () => {
    try {
        // Get block numbers to be processed from temporary tables on deposits & withdrawals
        const result = await query('select_distinct_blocks_transfers.sql', []);
        if (result === QUERY_ERROR) return false;

        if (result.rows.length > 0) {
            // Add block numbers into ETH_BLOCKS (incl. block timestamp)
            if (await loadEthBlocks(result.rows)) {

                // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
                const res = await query('insert_user_transfers.sql', []);
                if (res === QUERY_ERROR) return false;
                logger.info(`**DB: ${res.rowCount} records added into USER_TRANSFERS`);

                // Store latest block processed into table SYS_TABLE_LOADS
                const result = await query('select_max_block_transfers.sql', []);
                if (result === QUERY_ERROR) return false;
                const lastBlock = result.rows[0].max_block_number;
                if (result.rows) {
                    const result = await updateLastTableLoad(
                        'USER_TRANSFERS',
                        lastBlock,
                        moment.unix((await getBlockData(lastBlock)).timestamp),
                    );
                    return (result) ? true : false;
                }
            } else {
                return false;
            }
        } else {
            logger.info('**DB: No moar user transfers to be loaded (TMP_USER_DEPOSIT and TMP_USER_WITHDRAWALS empty?)');
        }
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
    }
}

/// @notice Generates a collection of dates from a given start date to an end date
/// @param _fromDate Start date
/// @param _toDdate End date
/// @return An array with all dates from the start to the end date
const generateDateRange = (_fromDate, _toDate) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            logger.info('**DB: Date format is incorrect: should be "DD/MM/YYYY');
            return;
        }

        // Build array of dates
        const fromDate = moment.utc(_fromDate, "DD/MM/YYYY");
        const toDate = moment.utc(_toDate, "DD/MM/YYYY");
        const days = toDate.diff(fromDate, 'days');
        let dates = [];
        let day;
        if (days >= 0) {
            for (let i = 0; i <= days; i++) {
                day = fromDate.clone().add(i, 'days');
                dates.push(day);
            }
        }
        return dates;
    } catch (err) {
        handleErr(`personalHandler->generateDateRange() [from: ${_fromDate}, to: ${_toDate}]`, err);
    }
}

// TODO: account as parameter. If null, do all accounts from TMP_USER_TRANSFERS.
const loadUserBalances = async (
    fromDate,
    toDate,
    account = null
) => {
    try {
        // Get users with any transfer
        const rows = (account)
            ? {
                rowCount: 1,
                rows: [{ user_address: account }]
            }
            : await query('select_distinct_users_transfers.sql', []);

        // For each date and for each user, check gvt & pwrd balance and insert data into USER_BALANCES
        const dates = generateDateRange(fromDate, toDate);
        for (const date of dates) {
            if (rows.rowCount > 0) {
                logger.info(`**DB: Processing ${rows.rowCount} user balance/s...`);
                const day = moment.utc(date, "DD/MM/YYYY")
                    .add(23, 'hours')
                    .add(59, 'seconds')
                    .add(59, 'minutes');
                const blockTag = {
                    blockTag: (await findBlockByDate(day)).block
                }
                let rowCount = 0;
                for (const item of rows.rows) {
                    const account = item.user_address;
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
                    const result = await query('insert_user_balances.sql', params);
                    rowCount += result.rowCount;
                }
                logger.info(`**DB: ${rowCount} record/s added into USER_BALANCES for date ${moment(date).format('DD/MM/YYYY')}`);
                await updateLastTableLoad(
                    'USER_BALANCES',
                    null,
                    date
                );
                return true;
            } else {
                logger.info('**DB: No users with transfers found - No balance calculation needed.');
                return false;
            }
        }
    } catch (err) {
        handleErr(`personalHandler->loadUserBalances() [from: ${fromDate}, to: ${toDate}, account: ${account}]`, err);
    }
}

/// @notice Loads net results into USER_NET_RESULTS
///         Data sourced from USER_DEPOSITS & USER_TRANSACTIONS (full load w/o filters)
/// @param fromDate Start date to load net results
/// @param toDdate End date to load net results
const loadUserNetResults = async (
    fromDate,
    toDate,
    account = null) => {
    try {
        const dates = generateDateRange(fromDate, toDate);
        let rowCount = 0;
        logger.info(`**DB: Processing user net result/s...`);
        for (const date of dates) {
            const day = moment(date).format('DD/MM/YYYY');
            const q = (account) ? 'insert_user_net_returns_by_address.sql' : 'insert_user_net_returns.sql';
            const params = (account) ? [day, account] : [day];
            rowCount = (await query(q, params)).rowCount;
            logger.info(`**DB: ${rowCount} record/s added into USER_NET_RESULTS for date ${day}`);
        }
    } catch (err) {
        handleErr(`personalHandler->loadUserNetResults() [from: ${fromDate}, to: ${toDate}, account: ${account}]`, err);
    }
}

/// @notice Calculates blocks and dates to be processed
/// @param fromDate Start date to process data
/// @param toDdate End date to process data
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Calculate dates & blocks to process
        const dates = generateDateRange(_fromDate, _toDate);
        const fromDate = dates[0].clone();
        const toDate = dates[dates.length - 1]
            .utc()
            .clone()
            .add(23, 'hours')
            .add(59, 'seconds')
            .add(59, 'minutes');
        const fromBlock = (await findBlockByDate(fromDate)).block;
        const toBlock = (await findBlockByDate(toDate)).block;
        return [fromBlock, toBlock, dates];
    } catch (err) {
        handleErr(`personalHandler->preload() [from: ${_fromDate}, to: ${_toDate}]`, err);
    }
}

/// @notice Reloads user transfers, balances & net results for a given time interval
/// @dev    Previous data for the given time interval will be overwritten
/// @dev    It is strongly recommended to reload data until D-1
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const reload = async (
    _fromDate,
    _toDate,
    account = null
) => {
    try {
        // Calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(_fromDate, _toDate);

        // Execute transfers calculations in temporary tables
        if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT, account))
            if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL, account)) {

                // Delete previous blocks from ETH_BLOCKS
                // TODO: delete in a single query?
                let rowCount = 0;
                const result = await query('select_distinct_blocks_transfers.sql', []);
                if (result === QUERY_ERROR) {
                    return;
                } else {
                    for (const block of result.rows) {
                        const result = await query('delete_eth_blocks.sql', [block.block_number]);
                        if (result === QUERY_ERROR) {
                            return;
                        } else {
                            rowCount += result.rowCount;
                        }
                    }
                }
                logger.info(`**DB: ${rowCount} record/s deleted from ETH_BLOCKS`);

                // Delete previous transfers, balances & net results
                let rowCountTransfers = 0;
                let rowCountBalances = 0;
                let rowCountNetReturns = 0;
                for (const day of dates) {
                    const params = (account)
                        ? [moment(day).format('DD/MM/YYYY'), account]
                        : [moment(day).format('DD/MM/YYYY')];
                    // Delete previous transfers from USER_TRANSFERS
                    // rowCountTramsfers += (await query((account) ? 'delete_user_transfers_by_address.sql' : 'delete_user_transfers.sql', params)).rowCount;
                    const resTransfers = await query((account) ? 'delete_user_transfers_by_address.sql' : 'delete_user_transfers.sql', params);
                    if (resTransfers === QUERY_ERROR) {
                        return;
                    } else {
                        rowCountTransfers += resTransfers.rowCount;
                    }
                    // Delete previous balances from USER_BALANCES
                    // rowCountBalances += (await query((account) ? 'delete_user_balances_by_address.sql' : 'delete_user_balances.sql', params)).rowCount;
                    const resBalances = await query((account) ? 'delete_user_balances_by_address.sql' : 'delete_user_balances.sql', params);
                    if (resBalances === QUERY_ERROR) {
                        return;
                    } else {
                        rowCountBalances += resBalances.rowCount;
                    }
                    // Delete previous net results from USER_NET_RESULTS
                    // rowCountNetReturns += (await query((account) ? 'delete_user_net_returns_by_address.sql' : 'delete_user_net_returns.sql', params)).rowCount;
                    const resReturns = await query((account) ? 'delete_user_net_returns_by_address.sql' : 'delete_user_net_returns.sql', params);
                    if (resReturns === QUERY_ERROR) {
                        return;
                    } else {
                        rowCountNetReturns += resReturns.rowCount;
                    }
                }
                logger.info(`**DB: ${rowCountTransfers} record/s deleted from USER_TRANSFERS`);
                logger.info(`**DB: ${rowCountBalances} record/s deleted from USER_BALANCES`);
                logger.info(`**DB: ${rowCountNetReturns} record/s deleted from USER_NET_RESULTS`);

                // Execute deposits, balances & net results calculations
                if (await loadUserTransfers())
                    if (await loadUserBalances(_fromDate, _toDate, account))
                        await loadUserNetResults(_fromDate, _toDate, account);
            }
    } catch (err) {
        handleErr(`personalHandler->reload() [from: ${_fromDate}, to: ${_toDate}, account: ${account}]`, err);
    }
}

/// @notice Loads user transfers, balances & net results for a given time interval
/// @dev    - If previous data was loaded for the same interval, there will be errors
///         referring to duplicated primary key
///         - If any data load fails, execution is stopped (to avoid data inconsistency)
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const load = async (
    fromDate,
    toDate,
    account = null
) => {
    // Calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate);

    // Execute deposits, balances & net results calculations
    if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT, account))
        if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL, account))
            if (await loadUserTransfers())
                if (await loadUserBalances(fromDate, toDate, account))
                    await loadUserNetResults(fromDate, toDate, account);
}

const loadGroStatsDB = async () => {
    try {
        const provider = getAlchemyRpcProvider('stats_gro');
        scanner = new BlocksScanner(provider);
        initDatabaseContracts().then(async () => {
            // TODO: ******* PROVAR una adreça que no existeixi
            //await load('04/06/2021', '04/06/2021', '0xb5bE4d2510294d0BA77214F26F704d2956a99072')
            //await reload("04/06/2021", "04/06/2021", '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
            //await load("04/06/2021", "04/06/2021", null);
            await reload("04/06/2021", "04/06/2021", null);
            process.exit(); // for testing purposes
        });
    } catch (err) {
        handleErr(`personalHandler->loadGroStatsDB()`, err);
    }
}

module.exports = {
    loadGroStatsDB,
};
