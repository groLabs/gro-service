"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadUserBalances = void 0;
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const loadTableUpdates_1 = require("./loadTableUpdates");
const globalUtil_1 = require("../common/globalUtil");
const personalUtil_1 = require("../common/personalUtil");
const personalStatsParser_1 = require("../parser/personalStatsParser");
const contractUtil_1 = require("../common/contractUtil");
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
/// @notice Loads balances into USER_STD_FACT_BALANCES
/// @dev    Data is sourced from SC calls to users' balances at a certain block number
///         according to the dates provided
/// @param  fromDate Start date to load balances
/// @param  toDdate End date to load balances
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserBalances = async (fromDate, toDate, account) => {
    try {
        // Get all distinct users with any transfer
        let users;
        if (account) {
            users = {
                rowCount: 1,
                rows: [{
                        user_address: account
                    }],
            };
        }
        else {
            users = await (0, queryHandler_1.query)('select_distinct_users_transfers.sql', []);
            if (users.status === constants_1.QUERY_ERROR)
                return false;
        }
        // For each date, check each gvt & pwrd balance and insert data into USER_STD_FACT_BALANCES
        const dates = (0, personalUtil_1.generateDateRange)(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${users.rowCount} user balance${(0, personalUtil_1.isPlural)(users.rowCount)}...`);
        for (const date of dates) {
            const day = moment_1.default.utc(date, "DD/MM/YYYY")
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');
            const blockTag = {
                // @ts-ignore
                blockTag: (await (0, globalUtil_1.findBlockByDate)(day, false)).block
            };
            let rowCount = 0;
            let rowExcluded = 0;
            for (const user of users.rows) {
                const addr = user.user_address;
                const gvtValue = (0, personalStatsParser_1.parseAmount)(await (0, contractUtil_1.getGroVault)().getAssets(addr, blockTag), 'USD');
                const pwrdValue = (0, personalStatsParser_1.parseAmount)(await (0, contractUtil_1.getPowerD)().getAssets(addr, blockTag), 'USD');
                const totalValue = gvtValue + pwrdValue;
                const params = [
                    day,
                    (0, personalUtil_1.getNetworkId)(),
                    addr,
                    totalValue,
                    gvtValue,
                    pwrdValue,
                    moment_1.default.utc()
                ];
                // zero balance accounts are excluded
                if (totalValue !== 0) {
                    const q = (account)
                        ? 'insert_user_cache_fact_balances.sql'
                        : 'insert_user_std_fact_balances.sql';
                    const result = await (0, queryHandler_1.query)(q, params);
                    if (result.status === constants_1.QUERY_ERROR)
                        return false;
                    rowCount += result.rowCount;
                }
                else {
                    rowExcluded++;
                }
            }
            let msg = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${(0, personalUtil_1.isPlural)(rowCount)} `;
            msg += `added into USER_STD_FACT_BALANCES `;
            msg += (rowExcluded !== 0) ? ` (excluded ${rowExcluded} with 0-balance) ` : '';
            msg += `for date ${(0, moment_1.default)(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        }
        else {
            const res = await (0, loadTableUpdates_1.loadTableUpdates)('USER_STD_FACT_BALANCES', fromDate, toDate);
            return (res) ? true : false;
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadUserBalances->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
};
exports.loadUserBalances = loadUserBalances;
