import moment from 'moment';
import { query } from '../handler/queryHandler';
import { handleErr } from '../common/personalUtil';
import { generateDateRange, isPlural } from '../common/personalUtil';
import { QUERY_ERROR } from '../constants';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

/// @notice Store the last load time and amount of records loaded into SYS_USER_LOADS
///         for each day of a given time range
/// @param tableName Name of the table that has been loaded
/// @param _fromDate Start date of loading process
/// @param _toDate End date of loading process
/// @return True if no exceptions found, false otherwise
const loadTableUpdates = async (tableName, _fromDate, _toDate) => {
    try {
        const dates = generateDateRange(_fromDate, _toDate);

        for (const date of dates) {

            const targetDate = moment.utc(date, "DD/MM/YYYY").format('MM/DD/YYYY');

            const params = [
                tableName,
                targetDate,
                moment.utc(),
            ];

            let q;
            switch (tableName) {
                case 'USER_TRANSFERS':
                    q = 'insert_sys_load_user_transfers.sql';
                    let result = await query(q, params);
                    if (result.status === QUERY_ERROR) {
                        return false;
                    } else if (result.rowCount === 0) {
                        // Insert 0 records to allow personalStats cache know the latest transfers
                        // loaded even one day there weren't events.
                        const params = [
                            tableName,
                            1,
                            date,
                            0,
                            moment.utc()
                        ];
                        q = 'insert_sys_load_zero_user_transfers.sql';
                        result = await query(q, params);
                        if (result.status === QUERY_ERROR)
                            return false;
                    }
                    logger.info(`**DB: ${result.rowCount} record${isPlural(result.rowCount)} added into SYS_USER_LOADS`);
                    break;
                // case 'USER_APPROVALS':
                //     q = 'insert_sys_load_user_approvals.sql';
                //     break;
                // case 'USER_BALANCES':
                //     q = 'insert_sys_load_user_balances.sql';
                //     break;
                // case 'USER_NET_RETURNS':
                //     q = 'insert_sys_load_user_net_returns.sql';
                //     break;
                default:
                    handleErr(`loadTableUpdates.ts->loadTableUpdates(): table name '${tableName}' not found`, null);
                    return false;
            }
        }

        //return (result.status !== QUERY_ERROR) ? true : false;
        return true;

    } catch (err) {
        const params = `table: ${tableName}, fromDate: ${_fromDate}, toDate: ${_toDate}`;
        handleErr(`loadTableUpdates->loadTableUpdates() ${params}`, err);
        return false;
    }
}

export {
    loadTableUpdates,
}
