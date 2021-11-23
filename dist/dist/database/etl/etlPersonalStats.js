"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.etlPersonalStats = void 0;
const queryHandler_1 = require("../handler/queryHandler");
const moment_1 = __importDefault(require("moment"));
const globalUtil_1 = require("../common/globalUtil");
const personalUtil_1 = require("../common/personalUtil");
const loadUserTransfers_1 = require("../loader/loadUserTransfers");
const loadUserBalances_1 = require("../loader/loadUserBalances");
const loadTokenPrice_1 = require("../loader/loadTokenPrice");
const loadUserNetReturns_1 = require("../loader/loadUserNetReturns");
const globalUtil_2 = require("../common/globalUtil");
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
/// @notice Truncate temporary tables & calculate blocks and dates to be processed
/// @param fromDate Start date to process data [format: 'DD/MM/YYYY']
/// @param toDdate End date to process data [format: 'DD/MM/YYYY']
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Truncate temporary tables
        const res = await Promise.all([
            (0, queryHandler_1.query)('truncate_user_std_tmp_approvals.sql', []),
            (0, queryHandler_1.query)('truncate_user_std_tmp_deposits.sql', []),
            (0, queryHandler_1.query)('truncate_user_std_tmp_withdrawals.sql', []),
        ]);
        if (res[0].status === constants_1.QUERY_ERROR ||
            res[1].status === constants_1.QUERY_ERROR ||
            res[2].status === constants_1.QUERY_ERROR)
            return;
        // Calculate dates & blocks to be processed
        const dates = (0, personalUtil_1.generateDateRange)(_fromDate, _toDate);
        const fromDate = dates[0].clone();
        const toDate = dates[dates.length - 1]
            .utc()
            .clone()
            .add(23, 'hours')
            .add(59, 'seconds')
            .add(59, 'minutes');
        // @ts-ignore
        const fromBlock = (await (0, globalUtil_1.findBlockByDate)(fromDate, true)).block;
        // @ts-ignore
        const toBlock = (await (0, globalUtil_1.findBlockByDate)(toDate, false)).block;
        return [fromBlock, toBlock, dates];
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStats->preload() [from: ${_fromDate}, to: ${_toDate}]`, err);
        return [];
    }
};
/// @notice Delete transfers, approvals, balances, net returns & prices for a given time interval
/// @dev    Date format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
/// @param  fromDate Start date to delete data
/// @param  toDdate End date to delete data
/// @return True if no exceptions found; false otherwise
const remove = async (fromDate, toDate, loadType) => {
    try {
        const fromDateParsed = (0, moment_1.default)(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = (0, moment_1.default)(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        // Remove transfers
        const transfers = await (0, queryHandler_1.query)('delete_user_std_fact_transfers.sql', params);
        if (transfers) {
            logger.info(`**DB: ${transfers.rowCount} record${(0, personalUtil_1.isPlural)(transfers.rowCount)} deleted from USER_STD_FACT_TRANSFERS`);
        }
        else {
            const params = `Dates [${fromDate} - ${toDate}]`;
            (0, personalUtil_1.handleErr)(`etlPersonalStats->remove() Delete query didn't return data. Params: ${params}`, null);
            return false;
        }
        // Remove balances, returns, approvals & sys load
        if (loadType === personalUtil_1.Load.FULL) {
            const [balances, netReturns, approvals, loads,] = await Promise.all([
                (0, queryHandler_1.query)('delete_user_std_fact_balances.sql', params),
                (0, queryHandler_1.query)('delete_user_std_fact_net_returns.sql', params),
                (0, queryHandler_1.query)('delete_user_std_fact_approvals.sql', params),
                (0, queryHandler_1.query)('delete_table_loads.sql', params),
            ]);
            if (balances &&
                netReturns &&
                approvals &&
                loads) {
                logger.info(`**DB: ${balances.rowCount} record${(0, personalUtil_1.isPlural)(balances.rowCount)} deleted from USER_STD_FACT_BALANCES`);
                logger.info(`**DB: ${netReturns.rowCount} record${(0, personalUtil_1.isPlural)(netReturns.rowCount)} deleted from USER_STD_FACT_NET_RETURNS`);
                logger.info(`**DB: ${approvals.rowCount} record${(0, personalUtil_1.isPlural)(approvals.rowCount)} deleted from USER_APPROVALS`);
                logger.info(`**DB: ${loads.rowCount} record${(0, personalUtil_1.isPlural)(loads.rowCount)} deleted from SYS_USER_LOADS`);
            }
            else {
                const params = `Dates [${fromDate} - ${toDate}]`;
                (0, personalUtil_1.handleErr)(`etlPersonalStats->remove() Delete query didn't return data. Params: ${params}`, null);
                return false;
            }
        }
        return true;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStats->remove() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
};
/// @notice Load user transfers, balances, net returns & prices for a given time interval
/// @dev    - Previous data for the given time interval will be removed
///         - If any data load fails, execution is stopped (to avoid data inconsistency)
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const load = async (fromDate, toDate, loadType) => {
    try {
        // Truncate temporary tables and calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(fromDate, toDate);
        // Load transfers, balances, net returns & prices
        if (fromBlock > 0 && toBlock > 0 && dates) {
            const res = await Promise.all([
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.DEPOSIT, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.WITHDRAWAL, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_GVT_OUT, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_GVT_IN, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_PWRD_OUT, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_PWRD_IN, null),
            ]);
            if (res.every(Boolean)) {
                // if (await loadTmpUserApprovals(fromBlock, toBlock, null))
                if (await remove(fromDate, toDate, loadType))
                    if (await (0, loadUserTransfers_1.loadUserTransfers)(fromDate, toDate, null))
                        // if (await loadUserApprovals(fromDate, toDate, null))
                        if (await (0, loadUserBalances_1.loadUserBalances)(fromDate, toDate, null, null, false))
                            //TODO: token price return null (eg: reload before Gro token)
                            if (await (0, loadTokenPrice_1.loadTokenPrice)(fromDate, toDate))
                                if (await (0, loadUserNetReturns_1.loadUserNetReturns)(fromDate, toDate, null))
                                    return true;
            }
            else {
                logger.warn(`**DB: Error/s found in etlPersonalStats.js->load()`);
            }
        }
        else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            (0, personalUtil_1.handleErr)(`etlPersonalStats->load() Error with parameters: ${params}`, null);
        }
        return false;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStats->load() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
};
// TODO (specially for mainnet)
const reloadApprovals = async () => { };
const loadTransfers = async (fromDate, toDate, loadType) => {
    try {
        // Truncate temporary tables and calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(fromDate, toDate);
        // Load transfers, balances, net returns & prices
        if (fromBlock > 0 && toBlock > 0 && dates) {
            const res = await Promise.all([
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.DEPOSIT, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.WITHDRAWAL, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_GVT_OUT, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_GVT_IN, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_PWRD_OUT, null),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, toBlock, personalUtil_1.Transfer.TRANSFER_PWRD_IN, null),
            ]);
            if (res.every(Boolean)) {
                if (await remove(fromDate, toDate, loadType))
                    if (await (0, loadUserTransfers_1.loadUserTransfers)(fromDate, toDate, null))
                        return true;
            }
            else {
                logger.warn(`**DB: Error/s found in etlPersonalStats.js->loadTransfers()`);
            }
        }
        else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            (0, personalUtil_1.handleErr)(`etlPersonalStats->loadTransfers() Error with parameters: ${params}`, null);
        }
        return false;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStats->loadTransfers() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
};
const etlPersonalStats = async (fromDate, toDate, loadType) => {
    try {
        if ((0, globalUtil_2.checkDateRange)(fromDate, toDate)) {
            let res;
            if (loadType === personalUtil_1.Load.FULL) {
                // Full load
                res = await load(fromDate, toDate, loadType);
            }
            else if (loadType === personalUtil_1.Load.TRANSFERS) {
                // Transfers load
                res = await loadTransfers(fromDate, toDate, loadType);
            }
            else {
                logger.error(`**DB: Invalid option in <load> argument: 1 for full load, 2 for transfers load`);
            }
            if (res) {
                if (loadType === personalUtil_1.Load.FULL) {
                    logger.info(`**DB: Personal stats - full load from ${fromDate} to ${toDate} is completed ;)`);
                }
                else {
                    logger.info(`**DB: Personal stats - transfers load from ${fromDate} to ${toDate} is completed ;)`);
                }
            }
            else {
                logger.error(`**DB: Personal stats load from ${fromDate} to ${toDate} is NOT completed :/`);
            }
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStats->etlPersonalStats()`, err);
    }
};
exports.etlPersonalStats = etlPersonalStats;
