"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.etlPersonalStatsCache = void 0;
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const configUtil_1 = require("../../common/configUtil");
const chainUtil_1 = require("../../common/chainUtil");
const globalUtil_1 = require("../common/globalUtil");
const personalUtil_1 = require("../common/personalUtil");
const loadUserTransfers_1 = require("../loader/loadUserTransfers");
const loadUserBalances_1 = require("../loader/loadUserBalances");
const loadUserNetReturns_1 = require("../loader/loadUserNetReturns");
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
/// @notice - Deletes all data in cache tables for a given user address
///         - Determines the starting date of cache load based on max date
///           in USER_BALANCES for a given user address
/// @param account User address for whom cache load will be performed
/// @return Array with start block and last date to be processed
const preloadCache = async (account) => {
    try {
        const params = [account];
        // TODO: if (res.every( val => (val !== 400 ))) {
        const [tmpApprovals, tmpDeposits, tmpWithdrawals, approvals, balances, netReturns, transfers, _fromDate,] = await Promise.all([
            (0, queryHandler_1.query)('delete_user_cache_tmp_approvals.sql', params),
            (0, queryHandler_1.query)('delete_user_cache_tmp_deposits.sql', params),
            (0, queryHandler_1.query)('delete_user_cache_tmp_withdrawals.sql', params),
            (0, queryHandler_1.query)('delete_user_cache_fact_approvals.sql', params),
            (0, queryHandler_1.query)('delete_user_cache_fact_balances.sql', params),
            (0, queryHandler_1.query)('delete_user_cache_fact_net_returns.sql', params),
            (0, queryHandler_1.query)('delete_user_cache_fact_transfers.sql', params),
            (0, queryHandler_1.query)('select_max_load_dates.sql', params),
        ]);
        if (tmpApprovals.status === constants_1.QUERY_ERROR ||
            tmpDeposits.status === constants_1.QUERY_ERROR ||
            tmpWithdrawals.status === constants_1.QUERY_ERROR ||
            approvals.status === constants_1.QUERY_ERROR ||
            balances.status === constants_1.QUERY_ERROR ||
            netReturns.status === constants_1.QUERY_ERROR ||
            transfers.status === constants_1.QUERY_ERROR ||
            _fromDate.status === constants_1.QUERY_ERROR)
            return [];
        // User has no balance yet in USER_BALANCES
        let fromDate;
        if (!_fromDate.rows[0].max_balance_date) {
            const launchBlock = (0, configUtil_1.getConfig)('blockchain.start_block');
            // @ts-ignore
            const timestamp = await (0, chainUtil_1.getTimestampByBlockNumber)(launchBlock);
            fromDate = moment_1.default
                .unix(timestamp)
                .utc();
            // It should be enough by looking a couple of days ago, but for testing purposes,
            // we look at all events from the contracts creation
            // fromDate = moment
            //     .utc()
            //     .subtract(2, 'days');
        }
        else {
            fromDate = moment_1.default
                .utc(_fromDate.rows[0].max_balance_date)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .add(1, 'days');
        }
        // Calculate starting date, starting block and dates range to be processed
        // const fromDate = moment
        //     .utc(_fromDate.rows[0].max_balance_date)
        //     .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        //     .add(1, 'days');
        // @ts-ignore
        const fromBlock = (await (0, globalUtil_1.findBlockByDate)(fromDate, true)).block;
        const toDate = moment_1.default
            .utc()
            .format('DD/MM/YYYY');
        return [fromBlock, toDate];
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStatsCache->preloadCache() [account: ${account}]`, err);
        return [];
    }
};
const loadCache = async (account) => {
    try {
        const [fromBlock, toDate] = await preloadCache(account);
        const fromDate = toDate;
        if (fromBlock > 0) {
            const res = await Promise.all([
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, 'latest', personalUtil_1.Transfer.DEPOSIT, account),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, 'latest', personalUtil_1.Transfer.WITHDRAWAL, account),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, 'latest', personalUtil_1.Transfer.TRANSFER_GVT_OUT, account),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, 'latest', personalUtil_1.Transfer.TRANSFER_GVT_IN, account),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, 'latest', personalUtil_1.Transfer.TRANSFER_PWRD_OUT, account),
                (0, loadUserTransfers_1.loadTmpUserTransfers)(fromBlock, 'latest', personalUtil_1.Transfer.TRANSFER_PWRD_IN, account),
            ]);
            //console.log('resssss:', res);
            //TODO: when errors retrieving deposits, withdrawals or transfers in personalUtil->getTransferEvents2()
            // (eg: Message: TypeError: Cannot read property 'PowerDollar' of undefined), it returns true!! (should be false)
            if (res.every(Boolean)) {
                //if (await loadTmpUserApprovals(fromBlock, 'latest', account))
                if (await (0, loadUserTransfers_1.loadUserTransfers)(null, null, account))
                    //if (await loadUserApprovals(null, null, account))
                    // TODO: time should be now(), otherwise it will take 23:59:59
                    if (await (0, loadUserBalances_1.loadUserBalances)(fromDate, toDate, account, null, false))
                        if (await (0, loadUserNetReturns_1.loadUserNetReturns)(fromDate, toDate, account))
                            return true;
            }
            else {
                logger.warn(`**DB: Error/s found in etlPersonalStatsCache.js->loadCache()`);
            }
        }
        else {
            const params = `user: ${account} fromBlock ${fromBlock}`;
            (0, personalUtil_1.handleErr)(`etlPersonalStatsCache->loadCache() Error with parameters: ${params}`, null);
        }
        return false;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStatsCache->loadCache()`, err);
    }
};
const etlPersonalStatsCache = async (account) => {
    try {
        const res = await loadCache(account);
        if (res) {
            logger.info(`**DB: Personal stats for account ${account} is completed ;)`);
        }
        else {
            logger.error(`**DB: Personal stats load for account ${account} is NOT completed :/`);
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`etlPersonalStatsCache->etlPersonalStatsCache()`, err);
    }
};
exports.etlPersonalStatsCache = etlPersonalStatsCache;
