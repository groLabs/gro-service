const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const {
    // QUERY_ERROR,
    handleErr,
} = require('../common/personalUtil');
const { QUERY_ERROR } = require('../constants');

/// @notice Stores the last load time and number of records loaded into a final table for 
///         each day of a given time period
/// @param tableName Name of the table
/// @param _fromDate Start date of loading process
/// @param _toDate End date of loading process
/// @return True if no exceptions found, false otherwise
const loadTableUpdates = async (tableName, _fromDate, _toDate) => {
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
        return (result.status !== QUERY_ERROR) ? true : false;
    } catch (err) {
        const params = `table: ${tableName}, fromDate: ${_fromDate}, toDate: ${_toDate}`;
        handleErr(`personalHandler->updateLastTableLoad() ${params}`, err);
        return false;
    }
}

module.exports = {
    loadTableUpdates,
}
