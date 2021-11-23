"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadUserNetReturns = void 0;
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const loadTableUpdates_1 = require("./loadTableUpdates");
const personalUtil_1 = require("../common/personalUtil");
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
/// @notice Load net returns into USER_STD_FACT_NET_RETURNS_UNSTAKED
/// @dev    Data sourced from USER_STD_FACT_DEPOSITS & USER_STD_FACT_TRANSACTIONS (full load w/o filters)
/// @param  fromDate Start date to load net returns
/// @param  toDdate End date to load net returns
/// @param  account User address for cache loading; null for daily loads
const loadUserNetReturns = async (fromDate, toDate, account) => {
    try {
        const dates = (0, personalUtil_1.generateDateRange)(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing user net returns...`);
        for (const date of dates) {
            /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
            const q = (account)
                ? 'insert_user_cache_fact_net_returns.sql'
                : 'insert_user_std_fact_net_returns.sql';
            const params = (account)
                ? [account]
                : [(0, moment_1.default)(date)
                        .format('MM/DD/YYYY')];
            const result = await (0, queryHandler_1.query)(q, params);
            if (result.status === constants_1.QUERY_ERROR)
                return false;
            const numResults = result.rowCount;
            let msg = `**DB${account ? ' CACHE' : ''}: ${numResults} record${(0, personalUtil_1.isPlural)(numResults)} added into `;
            msg += `USER_STD_FACT_NET_RETURNS for date ${(0, moment_1.default)(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        // Update table SYS_USER_LOADS with the last loads
        if (!account) {
            return await (0, loadTableUpdates_1.loadTableUpdates)('USER_STD_FACT_NET_RETURNS', fromDate, toDate);
        }
        else {
            return true;
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadUserNetReturns->loadUserNetReturns() [from: ${fromDate}, to: ${toDate}]`, err);
    }
};
exports.loadUserNetReturns = loadUserNetReturns;
