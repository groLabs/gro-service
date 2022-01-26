import moment from 'moment';
import { query } from '../handler/queryHandler';
import { isPlural } from '../common/globalUtil';
import { generateDateRange } from '../common/personalUtil';
import { QUERY_ERROR } from '../constants';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


/// @notice Store the last load time and amount of records loaded into SYS_USER_LOADS
///         for each day of a given time range
/// @param tableName Name of the table that has been loaded
/// @param _fromDate Start date of loading process
/// @param _toDate End date of loading process
/// @return True if no exceptions found, false otherwise
const loadTableUpdates = async (
    tableName: string,
    _fromDate: string,
    _toDate: string,
): Promise<boolean> => {
    try {
        const dates = generateDateRange(_fromDate, _toDate);

        for (const date of dates) {

            const targetDate = moment.utc(date, "DD/MM/YYYY").format('MM/DD/YYYY');

            const params = [
                tableName,
                targetDate,
                moment.utc(),
            ];

            let q: string;
            switch (tableName) {
                case 'USER_TRANSFERS':
                    q = 'insert_sys_load_user_transfers.sql';
                    let transfers = await query(q, params);
                    if (transfers.status === QUERY_ERROR) {
                        return false;
                    } else if (transfers.rowCount === 0) {
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
                        transfers = await query(q, params);
                        if (transfers.status === QUERY_ERROR)
                            return false;
                    }
                    showInfo(`${transfers.rowCount} record${isPlural(transfers.rowCount)} added into SYS_USER_LOADS for transfers`);
                    break;
                case 'USER_APPROVALS':
                    q = 'insert_sys_load_user_approvals.sql';
                    let approvals = await query(q, params);
                    if (approvals.status === QUERY_ERROR) {
                        return false;
                    } else if (approvals.rowCount > 0) {
                        showInfo(`${approvals.rowCount} record${isPlural(approvals.rowCount)} added into SYS_USER_LOADS for approvals`);
                    }
                    break;
                default:
                    showError(
                        'loadTableUpdates.ts->loadTableUpdates()',
                        `Table name '${tableName}' not found`
                    );
                    return false;
            }
        }

        return true;

    } catch (err) {
        const params = `table: ${tableName}, fromDate: ${_fromDate}, toDate: ${_toDate}`;
        showError(`loadTableUpdates.ts->loadTableUpdates() with params ${params}`, err);
        return false;
    }
}

export {
    loadTableUpdates,
}
