import moment from 'moment';
import { query } from '../handler/queryHandler';
import {
    isPlural,
    findBlockByDate,
    findBlockByDateAvax
} from '../common/globalUtil';
import { generateDateRange } from '../common/personalUtil';
import {
    loadUserTransfers,
    loadTmpUserTransfers
} from '../loader/loadUserTransfers';
import {
    loadUserApprovals,
    loadTmpUserApprovals
} from '../loader/loadUserApprovals';
import { checkDateRange } from '../common/globalUtil';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    TokenId,
    Transfer,
    GlobalNetwork as GN,
    ContractVersion as Ver,
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

        // TBC
        // [RangeError: Maximum call stack size exceeded]
        // const fromBlock = (await findBlockByDate(fromDate, true)).block;
        // const toBlock = (await findBlockByDate(toDate, false)).block;
        // const fromBlockAvax = (await findBlockByDateAvax(fromDate, true)).block;
        // const toBlockAvax = (await findBlockByDateAvax(toDate, false)).block;

        return [fromBlock, toBlock, dates, fromBlockAvax, toBlockAvax];
    } catch (err) {
        showError(
            'etlPersonalStats.ts->preload()',
            `[from: ${_fromDate}, to: ${_toDate}]: ${err}`
        );
        return [];
    }
};

/// @notice Delete transfers, approvals, balances, net returns & prices for a given time interval
/// @dev    Date format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
/// @param  fromDate The start date to delete data
/// @param  toDdate The end date to delete data
/// @return True if no exceptions found; false otherwise
const remove = async (
    fromDate: string,
    toDate: string,
): Promise<boolean> => {
    try {
        const fromDateParsed = moment(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = moment(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];

        // Remove transfers, approvals & sys loads
        const [
            transfers,
            approvals,
            loads,
        ] = await Promise.all([
            query('delete_user_transfers.sql', params),
            query('delete_user_approvals.sql', params),
            query('delete_table_loads.sql', params),
        ]);

        // Show amount of records deleted
        if (
            transfers.status === QUERY_SUCCESS
            && approvals.status === QUERY_SUCCESS
            && loads.status === QUERY_SUCCESS
        ) {
            showInfo(
                `${transfers.rowCount} record${isPlural(
                    transfers.rowCount
                )} deleted from USER_TRANSFERS`
            );
            showInfo(
                `${approvals.rowCount} record${isPlural(
                    approvals.rowCount
                )} deleted from USER_APPROVALS`
            );
            showInfo(
                `${loads.rowCount} record${isPlural(
                    loads.rowCount
                )} deleted from SYS_USER_LOADS`
            );
        } else {
            const params = `Dates [${fromDate} - ${toDate}]`;
            showError(
                'etlPersonalStats.ts->remove()',
                `Delete query didn't return data. Params: ${params}`
            );
            return false;
        }

        return true;
    } catch (err) {
        showError(
            'etlPersonalStats.ts->remove()',
            `[from: ${fromDate}, to: ${toDate}]: ${err}`
        );
        return false;
    }
};

// TODO (specially for mainnet)
// const reloadApprovals = async () => { };

const loadTransfers = async (
    fromDate: string,
    toDate: string,
    gn: GN
): Promise<boolean> => {
    try {
        // Truncate temporary tables and calculate dates & blocks to be processed
        const [fromBlock, toBlock, dates, fromBlockAvax, toBlockAvax] = await preload(fromDate, toDate);

        // Load transfers, balances, net returns & prices
        if (fromBlock > 0 && toBlock > 0 && dates) {

            const eth =
                gn === GN.ALL || gn === GN.ETHEREUM
                    ? [
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.DEPOSIT, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.WITHDRAWAL, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.TRANSFER_GVT_OUT, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.TRANSFER_GVT_IN, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.TRANSFER_PWRD_OUT, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.TRANSFER_PWRD_IN, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.TRANSFER_GRO_IN, null),
                        loadTmpUserTransfers(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.TRANSFER_GRO_OUT, null),
                        // loadTmpUserApprovals(GN.ETHEREUM, Ver.NO_VERSION, fromBlock, toBlock, Transfer.DEPOSIT, null),
                    ]
                    : null;

            // TODO: ****** Function to return an array of Avax vaults to be processed (instead of repeating code).

            const avaxVault_1_0 =
                gn === GN.ALL || gn === GN.AVALANCHE
                    ? [
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_0, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_OUT, null),
                    ]
                    : null;

            const avaxVault_1_5 =
                gn === GN.ALL || gn === GN.AVALANCHE
                    ? [
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_5, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_OUT, null),
                    ]
                    : null;

            const avaxVault_1_6 =
                gn === GN.ALL || gn === GN.AVALANCHE
                    ? [
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_6, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_OUT, null),
                    ]
                    : null;

            const avaxVault_1_7 =
                gn === GN.ALL || gn === GN.AVALANCHE
                    ? [
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDCe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDCe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_USDTe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_USDTe_OUT, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.DEPOSIT_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.WITHDRAWAL_DAIe, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_IN, null),
                        loadTmpUserTransfers(GN.AVALANCHE, Ver.VAULT_1_7, fromBlockAvax, toBlockAvax, Transfer.TRANSFER_DAIe_OUT, null),
                    ]
                    : null;

            let res = [];
            switch (gn) {
                case GN.ETHEREUM:
                    res = await Promise.all([
                        ...eth,
                    ]);
                    break;
                case GN.AVALANCHE:
                    res = await Promise.all([
                        ...avaxVault_1_0,
                        ...avaxVault_1_5,
                        ...avaxVault_1_6,
                        ...avaxVault_1_7,
                    ]);
                    break;
                case GN.ALL:
                    res = await Promise.all([
                        ...eth,
                        ...avaxVault_1_0,
                        ...avaxVault_1_5,
                        ...avaxVault_1_6,
                        ...avaxVault_1_7,
                    ]);
                    break;
                default:
                    showError(
                        'etlPersonalStats.ts->loadTransfers()',
                        `Unrecognized global network: ${gn}`
                    );
                    return false;
            }

            if (res.every(Boolean)) {
                if (await remove(fromDate, toDate))
                    if (await loadUserTransfers(fromDate, toDate, null))
                        //if (await loadUserApprovals(fromDate, toDate, null))
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
) => {
    try {
        if (checkDateRange(fromDate, toDate)) {
            let res = await loadTransfers(fromDate, toDate, gn);
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
