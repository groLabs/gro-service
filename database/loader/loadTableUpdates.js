const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const {
    handleErr,
} = require('../common/personalUtil');
const { QUERY_ERROR } = require('../constants');

/// @notice Stores the last load time and number of records loaded into SYS_USER_LOADS
///         for each day of a given time range
/// @param tableName Name of the table that has been loaded
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
            case 'USER_STD_FACT_BALANCES':
                q = 'insert_sys_load_user_balances.sql';
                break;
            case 'USER_STD_FACT_NET_RESULTS':
                q = 'insert_sys_load_user_net_results.sql';
                break;
            case 'USER_STD_FACT_TRANSFERS':
                q = 'insert_sys_load_user_transfers.sql';
                break;
            case 'USER_STD_FACT_APPROVALS':
                q = 'insert_sys_load_user_approvals.sql';
                break;
            default:
                handleErr(`loadTableUpdates->loadTableUpdates(): table name '${tableName}' not found`, null);
                return false;
        }
        const result = await query(q, params);
        return (result.status !== QUERY_ERROR) ? true : false;
    } catch (err) {
        const params = `table: ${tableName}, fromDate: ${_fromDate}, toDate: ${_toDate}`;
        handleErr(`loadTableUpdates->loadTableUpdates() ${params}`, err);
        return false;
    }
}

module.exports = {
    loadTableUpdates,
}
