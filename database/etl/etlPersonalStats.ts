import moment from 'moment';
import { query } from '../handler/queryHandler';
import {
    isPlural,
    getNetwork,
    findBlockByDate,
    findBlockByDateAvax,
} from '../common/globalUtil';
import { generateDateRange } from '../common/personalUtil';
import {
    loadUserTransfers,
    loadTmpUserTransfers,
} from '../loader/loadUserTransfers';
import {
    loadUserApprovals,
    loadTmpUserApprovals,
} from '../loader/loadUserApprovals';
import { checkDateRange } from '../common/globalUtil';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import {
    Transfer,
    LoadType as LT,
    GlobalNetwork as GN,
    ContractVersion as Ver,
    ContractVersion,
} from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


/// @notice Truncate temporary tables & calculate blocks and dates to be processed
/// @param fromDate Start date to process data [format: 'DD/MM/YYYY']
/// @param toDdate End date to process data [format: 'DD/MM/YYYY']
/// @return Array with start block, end block and list of dates to be processed
const preload = async (
    _fromDate: string,
    _toDate: string
) => {
    try {
        // Truncate temporary tables
        const res = await Promise.all([
            query('truncate_user_approvals_tmp.sql', []),
            query('truncate_user_deposits_tmp.sql', []),
            query('truncate_user_withdrawals_tmp.sql', []),
        ]);
        if (
            res[0].status === QUERY_ERROR
            || res[1].status === QUERY_ERROR
            || res[2].status === QUERY_ERROR
        )
            return;

        // Calc dates to be processed
        const dates = generateDateRange(_fromDate, _toDate);
        const fromDate = dates[0].clone();
        const toDate = dates[dates.length - 1]
            .utc()
            .clone()
            .add(23, 'hours')
            .add(59, 'seconds')
            .add(59, 'minutes');

        // Retrieve blocks from dates to be processed
        const [
            _fromBlock,
            _toBlock,
            _fromBlockAvax,
            _toBlockAvax
        ] = await Promise.all([
            findBlockByDate(fromDate, true),
            findBlockByDate(toDate, false),
            findBlockByDateAvax(fromDate, true),
            findBlockByDateAvax(toDate, false),
        ]);
        const fromBlock = _fromBlock.block;
        const toBlock = _toBlock.block;
        const fromBlockAvax = _fromBlockAvax.block;
        const toBlockAvax = _toBlockAvax.block;

        return [fromBlock, toBlock, dates, fromBlockAvax, toBlockAvax];
    } catch (err) {
        showError(
            'etlPersonalStats.ts->preload()',
            `[from: ${_fromDate}, to: ${_toDate}]: ${err}`
        );
        return [];
    }
};

/// @notice Delete transfers and/or approvals for a given time interval
/// @dev    Date format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
/// @param  fromDate The start date to delete data
/// @param  toDdate The end date to delete data
/// @param  gn The Global network (see types.ts)
/// @param  lt The Load type (see types.ts)
/// @return True if no exceptions found; false otherwise
const remove = async (
    fromDate: string,
    toDate: string,
    gn: GN,
    lt: LT,
): Promise<boolean> => {
    try {
        const fromDateParsed = moment(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = moment(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        let isError = false;

        if ((gn === GN.ETHEREUM || gn === GN.ALL) && (lt === LT.ALL || lt === LT.TRANSFERS)) {
            const res = await query('delete_user_transfers.sql', [...params, getNetwork(GN.ETHEREUM).id]);
            if (res.status === QUERY_SUCCESS) {
                showInfo(`${res.rowCount} record${isPlural(res.rowCount)} deleted from USER_TRANSFERS for Ethereum`);
            } else {
                isError = true;
            }
        }

        if ((gn === GN.ETHEREUM || gn === GN.ALL) && (lt === LT.ALL || lt === LT.APPROVALS)) {
            const res = await query('delete_user_approvals.sql', [...params, getNetwork(GN.ETHEREUM).id]);
            if (res.status === QUERY_SUCCESS) {
                showInfo(`${res.rowCount} record${isPlural(res.rowCount)} deleted from USER_APPROVALS for Ethereum`);
            } else {
                isError = true;
            }
        }

        if ((gn === GN.AVALANCHE || gn === GN.ALL) && (lt === LT.ALL || lt === LT.TRANSFERS)) {
            const res = await query('delete_user_transfers.sql', [...params, getNetwork(GN.AVALANCHE).id]);
            if (res.status === QUERY_SUCCESS) {
                showInfo(`${res.rowCount} record${isPlural(res.rowCount)} deleted from USER_TRANSFERS for Avalanche`);
            } else {
                isError = true;
            }
        }

        if ((gn === GN.AVALANCHE || gn === GN.ALL) && (lt === LT.ALL || lt === LT.APPROVALS)) {
            const res = await query('delete_user_approvals.sql', [...params, getNetwork(GN.AVALANCHE).id]);
            if (res.status === QUERY_SUCCESS) {
                showInfo(`${res.rowCount} record${isPlural(res.rowCount)} deleted from USER_APPROVALS for Avalanche`);
            } else {
                isError = true;
            }
        }

        if (isError) {
            const params = `Dates [${fromDate} - ${toDate}]`;
            showError(
                'etlPersonalStats.ts->remove()',
                `Delete query didn't return data. Params: ${params}`
            );
            return false;
        } else {
            return true;
        }

    } catch (err) {
        showError(
            'etlPersonalStats.ts->remove()',
            `[from: ${fromDate}, to: ${toDate}]: ${err}`
        );
        return false;
    }
};

const loadTransfers = async (
    fromDate: string,
    toDate: string,
    gn: GN,
    lt: LT,
): Promise<boolean> => {
    try {
        // Truncate temporary tables and calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates, fromBlockAvax, toBlockAvax] = await preload(fromDate, toDate);

        // Number of Avax contract versions
        const numAvaxVersions = (Object.keys(ContractVersion).length / 2) - 1;

        // Load transfers, balances, net returns & prices
        if (fromBlock > 0 && toBlock > 0 && dates) {

            let result = [];

            if ((gn === GN.ALL || gn === GN.ETHEREUM)
                && (lt === LT.ALL || lt === LT.TRANSFERS)) {
                // Load transfers types 1 to 8 from Ethereum (see types.ts->enum Transfer)
                result.push(...[...Array(8)].map((_, i) => loadTmpUserTransfers(
                    GN.ETHEREUM,
                    Ver.NO_VERSION,
                    fromBlock,
                    toBlock,
                    i + 1,
                    null,
                    false))
                );
            }

            if ((gn === GN.ALL || gn === GN.ETHEREUM)
                && (lt === LT.ALL || lt === LT.APPROVALS)) {
                // Load approvals for Ethereum
                result.push(
                    loadTmpUserApprovals(
                        GN.ETHEREUM,
                        Ver.NO_VERSION,
                        fromBlock,
                        toBlock,
                        Transfer.DEPOSIT,
                        null,
                        false)
                );
            }

            if ((gn === GN.ALL || gn === GN.AVALANCHE)
                && (lt === LT.ALL || lt === LT.TRANSFERS)) {
                // Load transfers types 500 to 511 from Avalanche (see types.ts->enum Transfer)
                // for every vault version
                for (let version = 1; version <= numAvaxVersions; version++) {
                    result.push(...[...Array(12)].map((_, i) => loadTmpUserTransfers(
                        GN.AVALANCHE,
                        version,
                        fromBlockAvax,
                        toBlockAvax,
                        i + 500,
                        null,
                        false))
                    );
                }
            }

            if ((gn === GN.ALL || gn === GN.AVALANCHE)
                && (lt === LT.ALL || lt === LT.APPROVALS)) {
                // Load approvals from Avalanche for every vault version
                for (let version = 1; version <= numAvaxVersions; version++) {
                    result.push(loadTmpUserApprovals(
                        GN.AVALANCHE,
                        version,
                        fromBlockAvax,
                        toBlockAvax,
                        Transfer.DEPOSIT_USDCe,
                        null,
                        false)
                    );
                }
            }

            const res = await Promise.all(result);

            if (res.every(Boolean)) {
                if (await remove(fromDate, toDate, gn, lt))
                    if (await loadUserTransfers(fromDate, toDate, null, gn, lt))
                        if (await loadUserApprovals(fromDate, toDate, null, gn, lt))
                            return true;
            } else {
                showError(
                    'etlPersonalStats.ts->loadTransfers()',
                    `Error/s found during loads`
                );
            }
        } else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            showError(
                'etlPersonalStats.ts->loadTransfers()',
                `Error with parameters: ${params}`);
        }
        return false;
    } catch (err) {
        showError(
            'etlPersonalStats.ts->loadTransfers()',
            `[from: ${fromDate}, to: ${toDate}]: ${err}`
        );
        return false;
    }
}

const etlPersonalStats = async (
    fromDate: string,
    toDate: string,
    gn: GN,
    lt: LT,
) => {
    try {
        if (checkDateRange(fromDate, toDate)) {
            let res = await loadTransfers(fromDate, toDate, gn, lt);
            if (res) {
                showInfo(`Personal stats load from ${fromDate} to ${toDate} is completed ;)`);
            } else {
                showError(
                    'etlPersonalStats.ts->etlPersonalStats()',
                    `Personal stats load from ${fromDate} to ${toDate} is NOT completed :/`
                );
            }
        } else {
            showError(
                'etlPersonalStats.ts->etlPersonalStats()',
                'Error in data ranges'
            );
        }
    } catch (err) {
        showError('etlPersonalStats.ts->etlPersonalStats()', err);
    }
};

export {
    etlPersonalStats,
};
