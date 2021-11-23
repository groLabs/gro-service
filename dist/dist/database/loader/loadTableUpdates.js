"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTableUpdates = void 0;
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const personalUtil_1 = require("../common/personalUtil");
const constants_1 = require("../constants");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
/// @notice Store the last load time and amount of records loaded into SYS_USER_LOADS
///         for each day of a given time range
/// @param tableName Name of the table that has been loaded
/// @param _fromDate Start date of loading process
/// @param _toDate End date of loading process
/// @return True if no exceptions found, false otherwise
const loadTableUpdates = async (tableName, _fromDate, _toDate) => {
    try {
        const fromDate = moment_1.default.utc(_fromDate, "DD/MM/YYYY").format('MM/DD/YYYY');
        const toDate = moment_1.default.utc(_toDate, "DD/MM/YYYY").format('MM/DD/YYYY');
        const params = [
            tableName,
            fromDate,
            toDate,
            moment_1.default.utc()
        ];
        let q;
        switch (tableName) {
            case 'USER_STD_FACT_TRANSFERS':
                q = 'insert_sys_load_user_transfers.sql';
                break;
            case 'USER_STD_FACT_APPROVALS':
                q = 'insert_sys_load_user_approvals.sql';
                break;
            case 'USER_STD_FACT_BALANCES':
                q = 'insert_sys_load_user_balances.sql';
                break;
            case 'USER_STD_FACT_NET_RETURNS':
                q = 'insert_sys_load_user_net_returns.sql';
                break;
            case 'TOKEN_PRICE':
                q = 'insert_sys_load_token_price.sql';
                break;
            default:
                (0, personalUtil_1.handleErr)(`loadTableUpdates->loadTableUpdates(): table name '${tableName}' not found`, null);
                return false;
        }
        const result = await (0, queryHandler_1.query)(q, params);
        return (result.status !== constants_1.QUERY_ERROR) ? true : false;
    }
    catch (err) {
        const params = `table: ${tableName}, fromDate: ${_fromDate}, toDate: ${_toDate}`;
        (0, personalUtil_1.handleErr)(`loadTableUpdates->loadTableUpdates() ${params}`, err);
        return false;
    }
};
exports.loadTableUpdates = loadTableUpdates;
