const ethers = require('ethers');
const { query } = require('../handler/queryHandler');
const { getPersonalStats } = require('../handler/personalHandler');
const BN = require('bignumber.js');
const {
    initDatabaseContracts,
    initAllContracts,
    getGvt,
    getPwrd,
    getBuoy,
    getDepositHandler,
    getVaultStabeCoins,
} = require('../../contract/allContracts');
const { getConfig } = require('../../common/configUtil');
const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const {
    EVENT_TYPE,
    getEvents: getTransferEV,
    getApprovalEvents: getApprovalEV,
} = require('../../common/logFilter');
const {
    getDefaultProvider,
    getAlchemyRpcProvider,
} = require('../../common/chainUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const BlocksScanner = require('../../stats/common/blockscanner');
const {
    getNetworkId,
    getStableCoinIndex,
    generateDateRange,
    handleErr,
    isDeposit,
    Transfer,
    transferType,
} = require('../common/personalUtil');
const {
    parseAmount,
    parseApprovalEvents,
    parseTransferEvents,
} = require('../common/personalParser');


const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

// TODO: replace hardcoded strings by CONSTANTS
// TODO: parse float function
// TODO: all CONSTANTS in one file: /common/constants.js
const QUERY_ERROR = 400;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
let scanner;

const getBlockData = async (blockNumber) => {
    const block = await getDefaultProvider()
        .getBlock(blockNumber)
        .catch((err) => {
            logger.error(err);
        });
    return block;
}

const isPlural = (count) => (count > 1) ? 's' : '';

/// @notice Adds new blocks into table ETH_BLOCKS
/// @return True if no exceptions found, false otherwise
const loadEthBlocks = async (func) => {
    try {
        // Get block numbers to be processed from temporary tables on deposits & withdrawals
        const q = (func === 'loadUserTransfers')
            ? 'select_distinct_blocks_tmp_transfers.sql'
            : 'select_distinct_blocks_tmp_approvals.sql';
        const blocks = await query(q, []);
        if (blocks === QUERY_ERROR) return false;

        // Insert new blocks into ETH_BLOCKS
        const numBlocks = blocks.rowCount;
        if (numBlocks > 0) {
            logger.info(`**DB: Processing ${numBlocks} block${isPlural(numBlocks)} from ${(func === 'loadUserTransfers')
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
            logger.info(`**DB: ${numBlocks} block${isPlural(numBlocks)} added into ETH_BLOCKS`);
        } else {
            logger.info(`**DB: No blocks to be added from ${(func === 'loadUserTransfers')
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

// TODO start: to be moved to /common. 
// Files currently using findBlockByDate(): statsDBHandler.js, apyHandler.js and currentApyHandler.js
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


/// @notice Stores the last load time and number of records loaded into a final table for 
///         each day of a given time period
/// @param tableName Name of the table
/// @param _fromDate Start date of loading process
/// @param _toDate End date of loading process
/// @return True if no exceptions found, false otherwise
const updateTableLoads = async (tableName, _fromDate, _toDate) => {
    try {
        const fromDate = moment.utc(_fromDate, "DD/MM/YYYY").format('MM/DD/YYYY');
        const toDate = moment.utc(_toDate, "DD/MM/YYYY").format('MM/DD/YYYY');
        const params = [
            tableName,
            fromDate,
            toDate,
            moment.utc()];
        let q;
        switch (tableName) {
            case 'USER_BALANCES':
                q = 'insert_sys_load_user_balances.sql';
                break;
            case 'USER_NET_RETURNS':
                q = 'insert_sys_load_user_net_returns.sql';
                break;
            case 'USER_TRANSFERS':
                q = 'insert_sys_load_user_transfers.sql';
                break;
            case 'USER_APPROVALS':
                q = 'insert_sys_load_user_approvals.sql';
                break;
            default:
                handleErr(`personalHandler->updateLastTableLoad(): table name '${tableName}' not found`, null);
                return false;
        }
        const result = await query(q, params);
        return (result !== QUERY_ERROR) ? true : false;
    } catch (err) {
        const params = `table: ${tableName}, fromDate: ${_fromDate}, toDate: ${_toDate}`;
        handleErr(`personalHandler->updateLastTableLoad() ${params}`, err);
        return false;
    }
}

const getGTokenFromTx = async (result, side) => {
    try {
        const numTx = result.length;
        logger.info(`**DB: Processing ${numTx} ${(side === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal'} transaction${isPlural(numTx)}...`);

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
                    const index = (side === Transfer.DEPOSIT) ? 1 : 2; // from is 0x0 : to is 0x0
                    // Only when a token is minted (from: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });
                        // Update result array with the correct GTokens
                        if (item.gvt_amount !== 0) {
                            item.gvt_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.gvt_amount = (side === Transfer.DEPOSIT) ? item.gvt_amount : -item.gvt_amount
                        } else {
                            item.pwrd_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.pwrd_amount = (side === Transfer.DEPOSIT) ? item.pwrd_amount : -item.pwrd_amount
                        }
                    }
                }
            }
        }
        logger.info(`**DB: ${result.length} transaction${isPlural(numTx)} processed`);
        return result;
    } catch (err) {
        handleErr(`personalHandler->getGTokenFromTx() [transfer: ${side}]`, err);
    }
};

// Calculate the PWRD value based on the ratio in the block when the deposit/withdrawal was performed
// Note from Kristian: pwrds factor is not applied to price, only GVT. So no need to apply this conversion
// const getPwrdValue = async (result) => {
//     try {
//         for (const item of result) {
//             if (item.pwrd_amount !== 0) {
//                 const blockTag = {
//                     blockTag: item.block_number
//                 };
//                 const factor = parseAmount(await getPwrd().factor(blockTag), 'USD');
//                 if (factor > 0) { 
//                     item.pwrd_value = item.pwrd_amount / factor;
//                 } else {
//                     handleErr(`personalHandler->getPwrdValue(): factor for PWRD is 0`, null);
//                 }
//                 console.log(factor, item)
//             }
//         }
//     } catch(err) {
//         handleErr(`personalHandler->getPwrdValue():`, null);
//     }
// }

// const isGToken = (tokenSymbol) => {
//     return (['DAI', 'USDC', 'USDT'].includes(tokenSymbol)) ? false : true;
// }

// /// @notice Generates a collection of dates from a given start date to an end date
// /// @param _fromDate Start date
// /// @param _toDdate End date
// /// @return An array with all dates from the start to the end date
// const generateDateRange = (_fromDate, _toDate) => {
//     try {
//         // Check format date
//         if (_fromDate.length !== 10 || _toDate.length !== 10) {
//             logger.info('**DB: Date format is incorrect: should be "DD/MM/YYYY');
//             return;
//         }
//         // Build array of dates
//         const fromDate = moment.utc(_fromDate, "DD/MM/YYYY");
//         const toDate = moment.utc(_toDate, "DD/MM/YYYY");
//         const days = toDate.diff(fromDate, 'days');
//         let dates = [];
//         let day;
//         if (days >= 0) {
//             for (let i = 0; i <= days; i++) {
//                 day = fromDate.clone().add(i, 'days');
//                 dates.push(day);
//             }
//         }
//         return dates;
//     } catch (err) {
//         handleErr(`personalHandler->generateDateRange() [from: ${_fromDate}, to: ${_toDate}]`, err);
//     }
// }

/* EXPERIMENTAL */
const showBalanceHourBlock = async (date, account) => {
    try {
        // let start = moment.utc("19/06/2021", "DD/MM/YYYY");
        // //const days = moment.duration(end.diff(start)).asDays();

        // let dates = [];
        // for (let i = 0; i <= 23; i++) {
        //     let newDate = moment(start).add(i, 'hours');
        //     //let newDateStr = moment(newDate).format('DD/MM/YYYY HH24:MI:SS');
        //     //console.log(newDateStr);
        //     //await reload(newDateStr, newDateStr, null);
        //     dates.push(newDate);
        // }

        // for (const date of dates) {
        //     const blockTag = {
        //         blockTag: (await findBlockByDate(date)).block
        //     }
        //     console.log(blockTag.blockTag)

        //     const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
        //     const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
        //     const totalValue = gvtValue + pwrdValue;
        //     const block = blockTag.blockTag;
        //     const params = {
        //         block: block,
        //         date : date,
        //         networkid: getNetworkId(),
        //         account: account,
        //         totalValue: totalValue,
        //         gvtValue: gvtValue,
        //         pwrdValue: pwrdValue,
        //     };
        //     // const result = await query('insert_user_balances.sql', params);
        //     // if (result === QUERY_ERROR) return false;
        //     // rowCount += result.rowCount;
        //     console.log(params);
        // }

        const blockTag = {
            blockTag: 25582733
        };
        const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
        const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
        const totalValue = gvtValue + pwrdValue;
        const params = {
            block: blockTag.blockTag,
            date: date,
            networkid: getNetworkId(),
            account: account,
            totalValue: totalValue,
            gvtValue: gvtValue,
            pwrdValue: pwrdValue,
        };
        console.log(params);
    } catch (err) {
        handleErr(`personalHandler->showBalanceHourBlock()`, err);
    }
}



// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const getApprovalEvents = async (account, fromBlock, toBlock) => {
    try {
        const logs = await getApprovalEV(
            account,
            fromBlock,
            toBlock,
        ).catch((err) => {
            handleErr(`personalHandler->getApprovalEvents()->getApprovalEvents(): `, err);
            return false;
        });

        // COMPTE: només dipòsits del mateix periode, o qualsevol dipòsit?
        const depositTx = [];
        const res = await query('select_tmp_deposits.sql', []);
        if (res === QUERY_ERROR) {
            return false;
        } else if (res.rows.length === 0) {
            logger.info(`**DB: Warning! 0 deposit transfers before processing approval events`);
        } else {
            for (const tx of res.rows) {
                depositTx.push(tx.tx_hash);
            }
        }

        // Remove approvals referring to deposits (only get stablecoin approvals)
        let logsFiltered = logs.filter((item) => !depositTx.includes(item.transactionHash));

        return logsFiltered;
    } catch (err) {
        handleErr(`personalHandler->getApprovalEvents() [blocks: from ${fromBlock} to: ${toBlock}, account: ${account}]`, err);
        return false;
    }
}

// @dev: STRONG DEPENDENCY with deposit transfers (related events have to be ignored) 
// @DEV: Table TMP_USER_DEPOSITS must be loaded before
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const loadTmpUserApprovals = async (
    fromBlock,
    toBlock,
) => {
    try {
        // Get all approval events for a given block range
        const logs = await getApprovalEvents(null, fromBlock, toBlock);
        if (!logs)
            return false;

        // Parse approval events
        logger.info(`**DB: Processing ${logs.length} approval event${isPlural(logs.length)}...`);
        const approvals = await parseApprovalEvents(logs);

        // Insert approvals into USER_APPROVALS
        // TODO: returning different types will be a problem in TS
        if (approvals)
            for (const item of approvals) {
                const params = (Object.values(item));
                const res = await query('insert_tmp_user_approvals.sql', params);
                if (res === QUERY_ERROR) return false;
            }
        return true;
    } catch (err) {
        handleErr(`personalHandler->loadTmpUserApprovals() [blocks: ${fromBlock} to: ${toBlock}]`, err);
        return false;
    }
}

const loadUserApprovals = async (fromDate, toDate) => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks('loadUserApprovals')) {
            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const res = await query('insert_user_approvals.sql', []);
            if (res === QUERY_ERROR) return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB: ${numTransfers} record${isPlural(numTransfers)} added into USER_APPROVALS`);
        } else {
            return false;
        }
        const res = await updateTableLoads('USER_APPROVALS', fromDate, toDate);
        return (res) ? true : false;
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
        return false;
    }
}

const getTransferEvents = async (side, fromBlock, toBlock, account) => {
    try {
        // Determine event type to apply filters
        let eventType;
        switch (side) {
            case Transfer.DEPOSIT:
                eventType = EVENT_TYPE.deposit;
                break;
            case Transfer.WITHDRAWAL:
                eventType = EVENT_TYPE.withdraw;
                break;
            case Transfer.EXTERNAL_GVT_DEPOSIT:
                eventType = EVENT_TYPE.inGvtTransfer;
                break;
            case Transfer.EXTERNAL_PWRD_DEPOSIT:
                eventType = EVENT_TYPE.inPwrdTransfer;
                break;
            case Transfer.EXTERNAL_GVT_WITHDRAWAL:
                eventType = EVENT_TYPE.outGvtTransfer;
                break;
            case Transfer.EXTERNAL_PWRD_WITHDRAWAL:
                eventType = EVENT_TYPE.outPwrdTransfer
                break;
            default:
                handleErr(`personalHandler->checkEventType()->switch: No valid event`, null);
                return false;
        };

        // Get all deposit or withdrawal events for a given block range
        const logs = await getTransferEV(
            eventType,
            fromBlock,
            toBlock,
            account,
        ).catch((err) => {
            handleErr(`personalHandler->checkEventType()->getEvents(): `, err);
            return false;
        });
        return logs;
    } catch (err) {
        handleErr(`personalHandler->checkEventType() [side: ${side}]`, err);
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
        const logs = await getTransferEvents(side, fromBlock, toBlock, null);
        if (!logs)
            return false;
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
            return true;
        }
        return true;
    } catch (err) {
        //handleErr(`personalHandler->loadTmpUserTransfers() [blocks from: ${fromBlock} to ${toBlock}, side: ${side}]`, err);
        console.log(err)
        return false;
    }
}

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
        const res = await updateTableLoads('USER_TRANSFERS', fromDate, toDate);
        return (res) ? true : false;
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
        return false;
    }
}

/// @notice Loads balances into USER_BALANCES
/// @dev Data is sourced from smart contract calls to user's balances at a certain block number
///      according to the dates provided
/// @param fromDate Start date to load balances
/// @param toDdate End date to load balances
/// @return True if no exceptions found, false otherwise
const loadUserBalances = async (
    fromDate,
    toDate,
) => {
    try {
        // Get users with any transfer
        const users = await query('select_distinct_users_transfers.sql', []);
        if (users === QUERY_ERROR) return false;

        // For each date, check gvt & pwrd balance and insert data into USER_BALANCES
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB: Processing ${users.rowCount} user balance${isPlural(users.rowCount)}...`);
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
                const result = await query('insert_user_balances.sql', params);
                if (result === QUERY_ERROR) return false;
                rowCount += result.rowCount;
            }
            let msg = `**DB: ${rowCount} record${isPlural(rowCount)} added into `;
            msg += `USER_BALANCES for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        const res = await updateTableLoads('USER_BALANCES', fromDate, toDate);
        return (res) ? true : false;
    } catch (err) {
        handleErr(`personalHandler->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

/// @notice Loads net results into USER_NET_RETURNS
/// @dev Data sourced from USER_DEPOSITS & USER_TRANSACTIONS (full load w/o filters)
/// @param fromDate Start date to load net results
/// @param toDdate End date to load net results
const loadUserNetReturns = async (
    fromDate,
    toDate,
) => {
    try {
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB: Processing user net result/s...`);
        for (const date of dates) {
            /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
            const day = moment(date).format('MM/DD/YYYY');
            const result = await query('insert_user_net_returns.sql', [day]);
            if (result === QUERY_ERROR) return false;
            const numResults = result.rowCount;
            let msg = `**DB: ${numResults} record${isPlural(numResults)} added into `;
            msg += `USER_NET_RETURNS for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        await updateTableLoads('USER_NET_RETURNS', fromDate, toDate);
    } catch (err) {
        handleErr(`personalHandler->loadUserNetReturns() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}

/// @notice Truncates temporaty tables & calculates blocks and dates to be processed
/// @param fromDate Start date to process data
/// @param toDdate End date to process data
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Truncate temporary table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
        const res1 = await query('truncate_tmp_user_approvals.sql', []);
        const res2 = await query('truncate_tmp_user_deposits.sql', []);
        const res3 = await query('truncate_tmp_user_withdrawals.sql', []);
        if (res1 === QUERY_ERROR || res2 === QUERY_ERROR || res3 === QUERY_ERROR) return;

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
        return [];
    }
}

/// @notice Deletes transfers, balances and net returns for the given dates interval
/// @param dates An array with all dates from the start to the end date
/// @param fromDate Start date to delete data
/// @param toDdate End date to delete data
/// @return True if no exceptions found, false otherwise
const remove = async (dates, _fromDate, _toDate) => {
    try {
        // Delete previous transfers, balances & net results
        let rowCountTransfers = 0;
        let rowCountBalances = 0;
        let rowCountNetReturns = 0;
        let rowCountApprovals = 0;
        let rowCountLoads = 0;
        for (const day of dates) {
            const params = [moment(day).format('DD/MM/YYYY')];
            //TODO **** encapsulate the 4 queries ****
            // Delete previous transfers from USER_TRANSFERS
            const resTransfers = await query('delete_user_transfers.sql', params);
            if (resTransfers === QUERY_ERROR) {
                return false;
            } else {
                rowCountTransfers += resTransfers.rowCount;
            }
            // Delete previous balances from USER_BALANCES
            const resBalances = await query('delete_user_balances.sql', params);
            if (resBalances === QUERY_ERROR) {
                return false;
            } else {
                rowCountBalances += resBalances.rowCount;
            }
            // Delete previous net results from USER_NET_RETURNS
            const resReturns = await query('delete_user_net_returns.sql', params);
            if (resReturns === QUERY_ERROR) {
                return false;
            } else {
                rowCountNetReturns += resReturns.rowCount;
            }
            // Delete previous approvals from USER_APPROVALS
            const resApprovals = await query('delete_user_approvals.sql', params);
            if (resApprovals === QUERY_ERROR) {
                return false;
            } else {
                rowCountApprovals += resApprovals.rowCount;
            }
            // Delete previous data loads from SYS_TABLE_LOADS
            const resLoads = await query('delete_table_loads.sql', params);
            if (resLoads === QUERY_ERROR) {
                return false;
            } else {
                rowCountLoads += resLoads.rowCount;
            }
        }
        logger.info(`**DB: ${rowCountTransfers} record${isPlural(rowCountTransfers)} deleted from USER_TRANSFERS`);
        logger.info(`**DB: ${rowCountBalances} record${isPlural(rowCountBalances)} deleted from USER_BALANCES`);
        logger.info(`**DB: ${rowCountNetReturns} record${isPlural(rowCountNetReturns)} deleted from USER_NET_RETURNS`);
        logger.info(`**DB: ${rowCountApprovals} record${isPlural(rowCountApprovals)} deleted from USER_APPROVALS`);
        logger.info(`**DB: ${rowCountLoads} record${isPlural(rowCountLoads)} deleted from SYS_TABLE_LOADS`);
        return true;
    } catch (err) {
        handleErr(`personalHandler->remove() [from: ${_fromDate}, to: ${_toDate}]`, err);
        return false;
    }
}

// TODO (specially for mainnet)
const reloadApprovals = async () => {

}

/// @notice Reloads user transfers, balances & net results for a given time interval
/// @dev    - Previous data for the given time interval will be overwritten
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const reload = async (
    fromDate,
    toDate,
) => {
    try {
        // Truncates TMP tables and calculates dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(fromDate, toDate);

        // Reload transfers, balances & net results
        if (fromBlock > 0 && toBlock > 0 && dates) {
            const [
                deposits,
                withdrawals,
                ext_gvt_deposit,
                ext_pwrd_deposit,
                ext_gvt_withdrawal,
                ext_pwrd_withdrawal,
            ] = await Promise.all([
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT),
            ]);

            if (deposits
                && withdrawals
                && ext_gvt_deposit
                && ext_pwrd_deposit
                && ext_gvt_withdrawal
                && ext_pwrd_withdrawal) {
                if (await loadTmpUserApprovals(fromBlock, toBlock))
                    if (await remove(dates, fromDate, toDate))
                        if (await loadUserTransfers(fromDate, toDate))
                            if (await loadUserApprovals(fromDate, toDate))
                                if (await loadUserBalances(fromDate, toDate))
                                    await loadUserNetReturns(fromDate, toDate);
            }
        } else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            handleErr(`personalHandler->reload() Error with parameters: ${params}`, null);
        }
    } catch (err) {
        handleErr(`personalHandler->reload() [from: ${fromDate}, to: ${toDate}]`, err);
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
) => {
    // Truncates TMP tables and calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate);

    // Reload transfers, balances & net results
    if (fromBlock > 0 && toBlock > 0) {
        const [
            deposits,
            withdrawals,
            ext_gvt_deposit,
            ext_pwrd_deposit,
            ext_gvt_withdrawal,
            ext_pwrd_withdrawal,
        ] = await Promise.all([
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT),
        ]);

        if (deposits
            && withdrawals
            && ext_gvt_deposit
            && ext_pwrd_deposit
            && ext_gvt_withdrawal
            && ext_pwrd_withdrawal) {
            if (await loadTmpUserApprovals(fromBlock, toBlock))
                if (await loadUserTransfers(fromDate, toDate))
                    if (await loadUserApprovals(fromDate, toDate))
                        if (await loadUserBalances(fromDate, toDate))
                            await loadUserNetReturns(fromDate, toDate);
        }
    } else {
        const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
        handleErr(`personalHandler->reload() Error with parameters: ${params}`, null);
    }
}

const loadGroStatsDB = async () => {
    try {
        const provider = getAlchemyRpcProvider('stats_gro');
        scanner = new BlocksScanner(provider);

        //initDatabaseContracts().then(async () => {
        initAllContracts().then(async () => {

            //     // DEV Kovan:
            //     // await reload('23/06/2021', '26/06/2021');
            //     // await reload('23/06/2021', '26/06/2021');

            //DEV Ropsten:
            // await reload('27/06/2021', '27/06/2021');
            // await load('27/06/2021', '30/06/2021');

            // PROD:
            await reload("02/07/2021", "04/07/2021");

            process.exit(); // for testing purposes
        });

        // JSON tests
        // const res = await getPersonalStats('29/06/2021', '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
        // console.log(res);
        // console.log('yo')
        // process.exit();

    } catch (err) {
        handleErr(`personalHandler->loadGroStatsDB()`, err);
    }
}

module.exports = {
    loadGroStatsDB,
};
