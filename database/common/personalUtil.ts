import moment from 'moment';
import { ethers } from 'ethers';
import { query } from '../handler/queryHandler';
import {
    isPlural,
    getProvider
} from './globalUtil';
import {
    QUERY_ERROR,
    ERC20_TRANSFER_SIGNATURE
} from '../constants';
import { Transfer } from '../types';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';

const ZERO_ADDRESS =
    '0x0000000000000000000000000000000000000000000000000000000000000000';


const transferType = (side: Transfer) => {
    switch (side) {
        // Ethereum
        case Transfer.DEPOSIT:
            return 'deposit';
        case Transfer.WITHDRAWAL:
            return 'withdrawal';
        case Transfer.TRANSFER_GVT_IN:
            return 'transfer-gvt-in';
        case Transfer.TRANSFER_PWRD_IN:
            return 'transfer-pwrd-in';
        case Transfer.TRANSFER_GVT_OUT:
            return 'transfer-gvt-out';
        case Transfer.TRANSFER_PWRD_OUT:
            return 'transfer-pwrd-out';
        case Transfer.TRANSFER_GRO_IN:
            return 'transfer-gro-in';
        case Transfer.TRANSFER_GRO_OUT:
            return 'transfer-gro-out';
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
        // Avalanche
        // 1.0
        case Transfer.DEPOSIT_USDCe:
            return 'deposit-USDCe';
        case Transfer.WITHDRAWAL_USDCe:
            return 'withdrawal-USDCe';
        case Transfer.TRANSFER_USDCe_IN:
            return 'transfer-USDCe-in';
        case Transfer.TRANSFER_USDCe_OUT:
            return 'transfer-USDCe-out';
        case Transfer.DEPOSIT_USDTe:
            return 'deposit-USDTe';
        case Transfer.WITHDRAWAL_USDTe:
            return 'withdrawal-USDTe';
        case Transfer.TRANSFER_USDTe_IN:
            return 'transfer-USDTe-in';
        case Transfer.TRANSFER_USDTe_OUT:
            return 'transfer-USDTe-out';
        case Transfer.DEPOSIT_DAIe:
            return 'deposit-DAIe';
        case Transfer.WITHDRAWAL_DAIe:
            return 'withdrawal-DAIe';
        case Transfer.TRANSFER_DAIe_IN:
            return 'transfer-DAIe-in';
        case Transfer.TRANSFER_DAIe_OUT:
            return 'transfer-DAIe-out';
        default:
            break;
    }
};

// Anything which is incoming: deposits & transfers in
const isInflow = (side: Transfer) => {
    return side === Transfer.DEPOSIT
        || side === Transfer.TRANSFER_GVT_IN
        || side === Transfer.TRANSFER_PWRD_IN
        || side === Transfer.TRANSFER_GRO_IN
        || side === Transfer.DEPOSIT_USDCe
        || side === Transfer.TRANSFER_USDCe_IN
        || side === Transfer.DEPOSIT_USDTe
        || side === Transfer.TRANSFER_USDTe_IN
        || side === Transfer.DEPOSIT_DAIe
        || side === Transfer.TRANSFER_DAIe_IN
        ? true
        : false;
};

const isOutflow = (side: Transfer) => {
    return side === Transfer.WITHDRAWAL
        || side === Transfer.TRANSFER_GVT_OUT
        || side === Transfer.TRANSFER_PWRD_OUT
        || side === Transfer.TRANSFER_GRO_OUT
        || side === Transfer.WITHDRAWAL_USDCe
        || side === Transfer.TRANSFER_USDCe_OUT
        || side === Transfer.WITHDRAWAL_USDTe
        || side === Transfer.TRANSFER_USDTe_OUT
        || side === Transfer.WITHDRAWAL_DAIe
        || side === Transfer.TRANSFER_DAIe_OUT
        ? true
        : false;
}

// Only transfers (excludes deposits & withdrawals)
const isTransfer = (side: Transfer) => {
    return side === Transfer.TRANSFER_GVT_IN
        || side === Transfer.TRANSFER_GVT_OUT
        || side === Transfer.TRANSFER_PWRD_IN
        || side === Transfer.TRANSFER_PWRD_OUT
        || side === Transfer.TRANSFER_GRO_IN
        || side === Transfer.TRANSFER_GRO_OUT
        || side === Transfer.TRANSFER_USDCe_IN
        || side === Transfer.TRANSFER_USDCe_OUT
        || side === Transfer.TRANSFER_USDTe_IN
        || side === Transfer.TRANSFER_USDTe_OUT
        || side === Transfer.TRANSFER_DAIe_IN
        || side === Transfer.TRANSFER_DAIe_OUT
        ? true
        : false;
}

// Only deposits or withdrawals (excludes transfers)
const isDepositOrWithdrawal = (side: Transfer) => {
    return side === Transfer.DEPOSIT
        || side === Transfer.WITHDRAWAL
        || side === Transfer.DEPOSIT_USDCe
        || side === Transfer.WITHDRAWAL_USDCe
        || side === Transfer.DEPOSIT_USDTe
        || side === Transfer.WITHDRAWAL_USDTe
        || side === Transfer.DEPOSIT_DAIe
        || side === Transfer.WITHDRAWAL_DAIe
        ? true
        : false;
}

// TODO/DUPLICATED: to be moved to /common
function getStableCoinIndex(tokenSymbol: string) {
    switch (tokenSymbol) {
        case 'DAI':
            return 0;
        case 'USDC':
            return 1;
        case 'USDT':
            return 2;
        default:
            //throw new ParameterError(`Not found token symbo: ${tokenSymbol}`);
            // TODO
            return -1;
    }
}

/// @notice Generates a collection of dates from a given start date to an end date
/// @param _fromDate Start date [date format: 'DD/MM/YYYY']
/// @param _toDdate End date [date format: 'DD/MM/YYYY']
/// @return An array with all dates from the start to the end date
const generateDateRange = (
    _fromDate: string,
    _toDate: string,
) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            showWarning(
                'personalUtils.ts->generateDateRange()',
                'Date format is incorrect: should be "DD/MM/YYYY"'
            );
            return;
        }
        // Build array of dates
        const fromDate = moment.utc(_fromDate, 'DD/MM/YYYY');
        const toDate = moment.utc(_toDate, 'DD/MM/YYYY');
        const days = toDate.diff(fromDate, 'days');
        let dates = [];
        let day;
        if (days >= 0) {
            for (let i = 0; i <= days; i++) {
                day = fromDate.clone().add(i, 'days');
                dates.push(day);
            }
        }
        return dates;
    } catch (err) {
        showError(
            'personalUtil.ts->generateDateRange()',
            `[from: ${_fromDate}, to: ${_toDate}]: ${err}`
        );
        return [];
    }
};

/// @notice Calculate the start and end date to load personal stats based on the last
///         successful load
/// @dev    - personal stats are only loaded when a day is completed, so the latest
///         possible day to be loaded will always D-1 (yesterday), but never the current day
///         - Last successful load is retrieved from table SYS_USER_LOADS
/// @return An array with the start and end date to load personal stats
///         eg: ['21/10/2021', '24/10/2021']
const calcLoadingDateRange = async () => {
    try {
        const res = await query('select_last_user_load.sql', []);
        if (res.status === QUERY_ERROR || res.rows.length === 0 || !res.rows[0].max_user_date) {
            if (res.rows.length === 0 || !res.rows[0].max_user_date)
                showError(
                    'personalUtils.ts->calcLoadingDateRange()',
                    'No dates found in DB to load personal stats'
                );
            return [];
        } else {
            const lastLoad = moment
                .utc(res.rows[0].max_user_date)
                .add(1, 'days')
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
            const yesterday = moment
                .utc()
                .subtract(1, 'days')
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
            return (yesterday.diff(lastLoad, 'days') >= 0)
                ? [
                    lastLoad.format('DD/MM/YYYY'),
                    yesterday.format('DD/MM/YYYY')
                ]
                : [];
        }
    } catch (err) {
        showError(`personalUtil.ts->calcLoadingDateRange()`, err);
        return [];
    }
}

//TODO: replaced by getAmountFromEvent()
const getGTokenFromTx = async (result, side, account) => {
    try {
        const numTx = result.length;
        showInfo(
            `${account ? ' CACHE' : ''}: Processing ${numTx} ${side === Transfer.DEPOSIT ? 'deposit' : 'withdrawal'
            } transaction${isPlural(numTx)}...`
        );

        // Interface for ERC20 token transfer
        const iface = new ethers.utils.Interface([
            'event Transfer(address indexed from, address indexed to, uint256 amount)',
        ]);

        // For all transactions -> for all logs -> retrieve GToken
        for (const item of result) {
            const txReceipt = await getProvider()
                .getTransactionReceipt(item.tx_hash)
                .catch((err) => {
                    console.log(err);
                });

            for (const log of txReceipt.logs) {
                // Only when signature is an ERC20 transfer: `Transfer(address from, address to, uint256 value)`
                if (log.topics[0] === ERC20_TRANSFER_SIGNATURE) {

                    const index = (side === Transfer.DEPOSIT)
                        ? 1     // from is 0x0
                        : 2;    // to is 0x0

                    // Only when a token is minted (from: 0x) or burnt (to: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });

                        // Update result array with the correct GVT or PWRD amount
                        if (item.gvt_amount !== 0) {
                            item.gvt_amount = parseFloat(
                                ethers.utils.formatEther(output.args[2])
                            );
                            item.gvt_amount =
                                side === Transfer.DEPOSIT
                                    ? item.gvt_amount
                                    : -item.gvt_amount;
                        } else {
                            item.pwrd_amount = parseFloat(
                                ethers.utils.formatEther(output.args[2])
                            );
                            item.pwrd_amount =
                                side === Transfer.DEPOSIT
                                    ? item.pwrd_amount
                                    : -item.pwrd_amount;
                        }
                    }
                }
            }
        }
        const sided = (side === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal'
        showInfo(`${account ? ' CACHE' : ''}: ${result.length} ${sided} transaction${isPlural(numTx)} processed`);
        return result;
    } catch (err) {
        showError('personalUtil.ts->getGTokenFromTx()', `[transfer: ${side}]: ${err}`);
        return [];
    }
};

// replacing getGTokenFromTx()
const getAmountFromEvent = async (result, side, account) => {
    try {
        const numTx = result.length;
        showInfo(`${account ? ' CACHE' : ''}: Processing ${numTx} ${side === Transfer.DEPOSIT ? 'deposit' : 'withdrawal'
            } transaction${isPlural(numTx)}...`
        );

        // Interface for ERC20 token transfer
        const iface = new ethers.utils.Interface([
            'event Transfer(address indexed from, address indexed to, uint256 amount)',
        ]);

        // For each deposit or withdrawal transaction -> for each TRANSFER log -> retrieve amount
        for (const item of result) {
            const txReceipt = await getProvider()
                .getTransactionReceipt(item.tx_hash)
                .catch((err) => {
                    console.log(err);
                });

            for (const log of txReceipt.logs) {
                // Only when signature is an ERC20 transfer: `Transfer(address from, address to, uint256 value)`
                if (log.topics[0] === ERC20_TRANSFER_SIGNATURE) {

                    const index = (side === Transfer.DEPOSIT)
                        ? 1     // from is 0x0
                        : 2;    // to is 0x0

                    // Only when a token is minted (from: 0x) or burnt (to: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });

                        // Update result array with the correct GVT or PWRD amount
                        const newAmount = parseFloat(ethers.utils.formatEther(output.args[2]));
                        item.amount =
                            side === Transfer.DEPOSIT
                                ? newAmount
                                : -newAmount;
                    }
                }
            }
        }
        const sided = (side === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal'
        showInfo(`${account ? ' CACHE' : ''}: ${result.length} ${sided} transaction${isPlural(numTx)} processed`);
        return result;
    } catch (err) {
        showError('personalUtil.ts->getAmountFromEvent()', `[transfer: ${side}]: ${err}`);
        return [];
    }
};

export {
    getStableCoinIndex,
    generateDateRange,
    calcLoadingDateRange,
    getAmountFromEvent,
    getGTokenFromTx,
    isInflow,
    isOutflow,
    isDepositOrWithdrawal,
    isTransfer,
    transferType,
};
