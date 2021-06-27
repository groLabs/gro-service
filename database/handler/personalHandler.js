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
const Transfer = Object.freeze({
    "DEPOSIT": 1,
    "WITHDRAWAL": 2,
    "EXTERNAL_GVT_DEPOSIT": 3,
    "EXTERNAL_PWRD_DEPOSIT": 4,
    "EXTERNAL_GVT_WITHDRAWAL": 5,
    "EXTERNAL_PWRD_WITHDRAWAL": 6
});
let scanner;

const parseAmount = (amount, coin) => {
    return parseFloat(div(
        amount,
        (coin === 'DAI' || coin === 'USD') ? BN(10).pow(18) : BN(10).pow(6),
        amountDecimal
    ));
}

const transferType = (side) => {
    switch (side) {
        case Transfer.DEPOSIT:
            return 'deposit';
        case Transfer.WITHDRAWAL:
            return 'withdrawal';
        case Transfer.EXTERNAL_GVT_DEPOSIT:
            return 'ext_gvt_deposit'
        case Transfer.EXTERNAL_PWRD_DEPOSIT:
            return 'ext_pwrd_deposit';
        case Transfer.EXTERNAL_GVT_WITHDRAWAL:
            return 'ext_gvt_withdrawal'
        case Transfer.EXTERNAL_PWRD_WITHDRAWAL:
            return 'ext_pwrd_withdrawal'
        default:
            break;
    }
}

const isDeposit = (side) => {
    return (side === Transfer.DEPOSIT
        || side === Transfer.EXTERNAL_GVT_DEPOSIT
        || side === Transfer.EXTERNAL_PWRD_DEPOSIT)
        ? true
        : false;
}

// TODO start: to be included in /commmon/chainUtil.js
const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV) {
            case 'mainnet': return 1;
            case 'ropsten': return 3;
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

const isPlural = (count) => (count > 1) ? 's' : '';

/// @notice Adds new blocks into table ETH_BLOCKS
/// @return True if no exceptions found, false otherwise
const loadEthBlocks = async () => {
    try {
        // Get block numbers to be processed from temporary tables on deposits & withdrawals
        const blocks = await query('select_distinct_blocks_tmp_transfers.sql', []);
        if (blocks === QUERY_ERROR) return false;

        // Insert new blocks into ETH_BLOCKS
        const numBlocks = blocks.rowCount;
        if (numBlocks > 0) {
            logger.info(`**DB: Processing ${numBlocks} block${isPlural(numBlocks)}...`);
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
            logger.info(`**DB: No new blocks to be added`);
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
            };
        };
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

const parseFromTransferEvent = async (logs, side) => {
    try {
        let result = [];
        logs.forEach((log) => {
            const dai_amount =
                (side === Transfer.DEPOSIT)
                    ? parseAmount(log.args[4][0], 'DAI') // LogNewDeposit.tokens[0]
                    : (side === Transfer.WITHDRAWAL)
                        ? - parseAmount(log.args[8][0], 'DAI') // LogNewWithdrawal.tokenAmounts[0]
                        : 0;
            const usdc_amount =
                (side === Transfer.DEPOSIT)
                    ? parseAmount(log.args[4][1], 'USDC') // LogNewDeposit.tokens[1]
                    : (side === Transfer.WITHDRAWAL)
                        ? - parseAmount(log.args[8][1], 'USDC') // LogNewWithdrawal.tokenAmounts[1]
                        : 0;
            const usdt_amount =
                (side === Transfer.DEPOSIT)
                    ? parseAmount(log.args[4][2], 'USDT') // LogNewDeposit.tokens[2]
                    : (side === Transfer.WITHDRAWAL)
                        ? - parseAmount(log.args[8][2], 'USDT') // LogNewWithdrawal.tokenAmounts[2]
                        : 0;
            const usd_deduct =
                (side === Transfer.WITHDRAWAL)
                    ? - parseAmount(log.args[5], 'USD') // LogNewWithdrawal.deductUsd
                    : 0;
            const lp_amount =
                (side === Transfer.WITHDRAWAL)
                    ? - parseAmount(log.args[7], 'USD') // LogNewWithdrawal.lpAmount
                    : 0;
            const usd_return =
                (side === Transfer.WITHDRAWAL)
                    ? - parseAmount(log.args[6], 'USD') // LogNewWithdrawal.returnUsd
                    : (side === Transfer.EXTERNAL_GVT_WITHDRAWAL)
                        ? - (parseAmount(log.args[2], 'USD') / parseAmount(log.args[3], 'USD')) // LogTransfer.amount /  LogTransfer.ratio (GVT)
                        : (side === Transfer.EXTERNAL_PWRD_WITHDRAWAL)
                            ? - parseAmount(log.args[2], 'USD') // LogTransfer.amount (PWRD)
                            : 0;
            const usd_value =
                (side === Transfer.DEPOSIT)
                    ? parseAmount(log.args[3], 'USD') // LogNewDeposit.usdAmount  ** TODO: retrieve the ratio!!!! **
                    : (side === Transfer.WITHDRAWAL || side === Transfer.EXTERNAL_GVT_WITHDRAWAL || side === Transfer.EXTERNAL_PWRD_WITHDRAWAL)
                        ? usd_return
                        : (side === Transfer.EXTERNAL_GVT_DEPOSIT)
                            ? parseAmount(log.args[2], 'USD') / parseAmount(log.args[3], 'USD') // LogTransfer.amount /  LogTransfer.ratio (GVT)
                            : (side === Transfer.EXTERNAL_PWRD_DEPOSIT)
                                ? parseAmount(log.args[2], 'USD') // // LogTransfer.amount (PWRD) ** TODO: retrieve the ratio!!!! **
                                : 0;
            const stable_amount =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL)
                    ? dai_amount + usdc_amount + usdt_amount
                    : 0;
            const isGVT =
                (((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && !log.args[2])
                    || side === Transfer.EXTERNAL_GVT_DEPOSIT
                    || side === Transfer.EXTERNAL_GVT_WITHDRAWAL)
                    ? true
                    : false;
            const gvt_amount =
                ((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && isGVT)
                    ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL
                    : (side === Transfer.EXTERNAL_GVT_DEPOSIT)
                        ? parseAmount(log.args[2], 'USD') // LogTransfer.amount (GVT)
                        : (side === Transfer.EXTERNAL_GVT_WITHDRAWAL)
                            ? - parseAmount(log.args[2], 'USD') // LogTransfer.amount (GVT)
                            : 0;
            const pwrd_amount =
                ((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && !isGVT)
                    ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL
                    : (side === Transfer.EXTERNAL_PWRD_DEPOSIT)
                        ? parseAmount(log.args[2], 'USD') // LogTransfer.amount (PWRD)
                        : (side === Transfer.EXTERNAL_PWRD_WITHDRAWAL)
                            ? - parseAmount(log.args[2], 'USD') // LogTransfer.amount (PWRD)
                            : 0;
            const userAddress =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL)
                    ? log.args[0] // LogNewDeposit.user or LogNewWithdrawal.user
                    : (side === Transfer.EXTERNAL_GVT_WITHDRAWAL || side === Transfer.EXTERNAL_PWRD_WITHDRAWAL)
                        ? log.args[0] // LogTransfer.sender
                        : log.args[1]; // LogTransfer.receiver
            const referralAddress =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL)
                    ? log.args[1]
                    : '0x0000000000000000000000000000000000000000';

            result.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: getNetworkId(),
                transfer_type: transferType(side),
                user_address: userAddress,
                referral_address: referralAddress,
                usd_value: usd_value,
                gvt_value: isGVT ? usd_value : 0,
                pwrd_value: isGVT ? 0 : usd_value,
                gvt_amount: gvt_amount,
                pwrd_amount: pwrd_amount,
                stable_amount: stable_amount,
                dai_amount: dai_amount,
                usdc_amount: usdc_amount,
                usdt_amount: usdt_amount,
                creation_date: moment.utc(),
                ...(!isDeposit(side)) && { usd_deduct: usd_deduct },
                ...(!isDeposit(side)) && { usd_return: usd_return },
                ...(!isDeposit(side)) && { lp_amount: lp_amount },
            });
        });
        return result;
    } catch (err) {
        handleErr(`personalHandler->parseFromTransferEvent() [side: ${side}]`, err);
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
                return false;
        };

        // Get all deposit or withdrawal events for a given block range
        const logs = await getEvents(
            eventType,
            fromBlock,
            toBlock,
            null,
        ).catch((err) => {
            handleErr(`personalHandler->loadTmpUserTransfers()->getEvents(): `, err);
        });
        
        // Store data into table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
        let finalResult = [];
        if (logs.length > 0) {
            const preResult = await parseFromTransferEvent(logs, side);
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
            const rows = await query(
                (isDeposit(side))
                    ? 'insert_tmp_user_deposits.sql'
                    : 'insert_tmp_user_withdrawals.sql'
                , params);
            if (rows === QUERY_ERROR) return false;
            logger.info(`**DB: ${rows} ${transferType(side)}${isPlural(rows)} added into ${(isDeposit(side))
                ? 'TMP_USER_DEPOSITS'
                : 'TMP_USER_WITHDRAWALS'
                }`);
        } else {
            logger.info(`**DB: No ${transferType(side)}s found`);
            return true;
        }
        // Store latest block processed into table SYS_TABLE_LOADS
        // const lastBlock = finalResult[finalResult.length - 1].block_number;
        // const result = await updateLastTableLoad(
        //     (side === Transfer.DEPOSIT) ? 'TMP_USER_DEPOSITS' : 'TMP_USER_WITHDRAWALS',
        //     lastBlock,
        //     moment.unix((await getBlockData(lastBlock)).timestamp),
        // );
        //return (result) ? true : false;
        return true;

    } catch (err) {
        handleErr(`personalHandler->loadTmpUserTransfers() [blocks from: ${fromBlock} to ${toBlock}, side: ${side}]`, err);
        return false;
    }
}

/// @notice Load deposits/withdrawals into USER_TRANSFERS
///         Data sourced from TMP_USER_DEPOSITS & TMP_USER_TRANSACTIONS (full load w/o filters)
///         All blocks from such transactions are stored into ETH_BLOCKS (incl. timestamp)
///         Latest block & time processed are stored into SYS_TABLE_LOADS
/// @return True if no exceptions found, false otherwise
const loadUserTransfers = async () => {
    try {
        // Add new blocks into ETH_BLOCKS (incl. block timestamp)
        if (await loadEthBlocks()) {

            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            const res = await query('insert_user_transfers.sql', []);
            if (res === QUERY_ERROR) return false;
            const numTransfers = res.rowCount;
            logger.info(`**DB: ${numTransfers} record${isPlural(numTransfers)} added into USER_TRANSFERS`);

            // Store latest block processed into table SYS_TABLE_LOADS
            // const maxBlock = await query('select_max_block_transfers.sql', []);
            // if (maxBlock === QUERY_ERROR) return false;
            // const lastBlock = maxBlock.rows[0].max_block_number;
            // if (maxBlock.rows) {
            //     const result = await updateLastTableLoad(
            //         'USER_TRANSFERS',
            //         lastBlock,
            //         moment.unix((await getBlockData(lastBlock)).timestamp),
            //     );
            //     return (result) ? true : false;
            // }
        } else {
            return false;
        }
        return true;
    } catch (err) {
        handleErr('personalHandler->loadUserTransfers()', err);
    }
}

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
            logger.info(`**DB: ${rowCount} record${isPlural(rowCount)} added into USER_BALANCES for date ${moment(date).format('DD/MM/YYYY')}`);
        }

        // Update table SYS_TABLE_LOADS
        await updateLastTableLoad(
            'USER_BALANCES',
            null,
            dates[dates.length - 1]
        );
        return true;
    } catch (err) {
        handleErr(`personalHandler->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}

/// @notice Loads net results into USER_NET_RETURNS
/// @dev Data sourced from USER_DEPOSITS & USER_TRANSACTIONS (full load w/o filters)
/// @param fromDate Start date to load net results
/// @param toDdate End date to load net results
/// @return True if no exceptions found, false otherwise
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
            logger.info(`**DB: ${numResults} record${isPlural(numResults)} added into USER_NET_RETURNS for date ${moment(date).format('DD/MM/YYYY')}`);
        }
    } catch (err) {
        handleErr(`personalHandler->loadUserNetReturns() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}

/// @notice Calculates blocks and dates to be processed
/// @param fromDate Start date to process data
/// @param toDdate End date to process data
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Truncate temporary table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
        const res1 = await query('truncate_tmp_user_deposits.sql', []);
        const res2 = await query('truncate_tmp_user_withdrawals.sql', []);
        if (res1 === QUERY_ERROR || res2 === QUERY_ERROR) return;
        // TODO: if error?

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
        for (const day of dates) {
            const params = [moment(day).format('DD/MM/YYYY')];
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
        }
        logger.info(`**DB: ${rowCountTransfers} record${isPlural(rowCountTransfers)} deleted from USER_TRANSFERS`);
        logger.info(`**DB: ${rowCountBalances} record${isPlural(rowCountBalances)} deleted from USER_BALANCES`);
        logger.info(`**DB: ${rowCountNetReturns} record${isPlural(rowCountNetReturns)} deleted from USER_NET_RETURNS`);
        return true;
    } catch (err) {
        handleErr(`personalHandler->remove() [from: ${_fromDate}, to: ${_toDate}]`, err);
        return false;
    }
}

/// @notice Reloads user transfers, balances & net results for a given time interval
/// @dev    - Previous data for the given time interval will be overwritten
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const reload = async (
    _fromDate,
    _toDate,
) => {
    try {
        // Calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(_fromDate, _toDate);

        // Execute transfers calculations in temporary tables
        if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT))
            if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL))
                if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL))
                    if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT))
                        if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL))
                            if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT))
                                if (await remove(dates, _fromDate, _toDate))
                                    if (await loadUserTransfers())
                                        if (await loadUserBalances(_fromDate, _toDate))
                                            await loadUserNetReturns(_fromDate, _toDate);
    } catch (err) {
        handleErr(`personalHandler->reload() [from: ${_fromDate}, to: ${_toDate}]`, err);
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
    // Calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate);

    // Execute deposits, balances & net results calculations
    if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT))
        if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL))
            if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL))
                if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT))
                    if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL))
                        if (await loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT))
                            if (await loadUserTransfers())
                                if (await loadUserBalances(fromDate, toDate))
                                    await loadUserNetReturns(fromDate, toDate);
}

const loadGroStatsDB = async () => {
    try {
        const provider = getAlchemyRpcProvider('stats_gro');
        scanner = new BlocksScanner(provider);

        initDatabaseContracts().then(async () => {
            // DEV:
            // await reload('23/06/2021', '26/06/2021');
            // await load('23/06/2021', '26/06/2021');

            // PROD:
            await load("29/05/2021", "26/06/2021");

            process.exit(); // for testing purposes
        });


    } catch (err) {
        handleErr(`personalHandler->loadGroStatsDB()`, err);
    }
}

module.exports = {
    loadGroStatsDB,
};
