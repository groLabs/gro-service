import { ethers } from 'ethers';
import moment from 'moment';
import { ContractNames } from '../../registry/registry';
import {
    getEvents,
    getFilterEvents
} from '../../common/logFilter-new';
import {
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
    getCoinApprovalFilters
} from '../../common/filterGenerateTool';
import {
    getProvider,
    getProviderAvax
} from './globalUtil';
import { query } from '../handler/queryHandler';
import {
    QUERY_ERROR,
    ERC20_TRANSFER_SIGNATURE
} from '../constants';
import { Transfer } from '../types';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const ZERO_ADDRESS =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
const isPlural = (count) => (count > 1 ? 's' : '');
const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
};


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
        // Avalanche
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
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
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

const getBlockData = async (blockNumber) => {
    const block = await getProvider()
        .getBlock(blockNumber)
        .catch((err) => {
            logger.error(err);
        });
    return block;
};

const getBlockDataAvax = async (blockNumber) => {
    const block = await getProviderAvax()
        .getBlock(blockNumber)
        .catch((err) => {
            logger.error(err);
        });
    return block;
};

// TODO: to be replaced by getNetworkId2()
const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet':
                return 1;
            case 'ropsten':
                return 3;
            case 'kovan':
                return 42;
        }
        return -1;
    } catch (err) {
        logger.error(err);
    }
};

// TODO/DUPLICATED: to be moved to /common
function getStableCoinIndex(tokenSymbol) {
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
/// @param _fromDate Start date [date format: 'DD/MM/YYYY]
/// @param _toDdate End date [date format: 'DD/MM/YYYY]
/// @return An array with all dates from the start to the end date
const generateDateRange = (_fromDate, _toDate) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            logger.info(
                '**DB: Date format is incorrect: should be "DD/MM/YYYY'
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
        handleErr(`personalUtil->generateDateRange() [from: ${_fromDate}, to: ${_toDate}]`, err);
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
                logger.error('**DB: No dates found in DB to load personal stats');
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
        handleErr(`personalUtil->generateLoadingDateRange()`, err);
        return [];
    }
}

const getTransferEvents2 = async (
    side: Transfer,
    fromBlock,
    toBlock,    //TODO: number or 'latest'.... so what?
    account: string
) => {
    try {
        // Determine event type to apply filters
        let eventType: string = '';
        let contractName: string = '';
        let sender: string = '';
        let receiver: string = '';
        switch (side) {
            // Ethereum
            case Transfer.DEPOSIT:
                eventType = 'LogNewDeposit';
                contractName = ContractNames.depositHandler;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL:
                eventType = 'LogNewWithdrawal';
                contractName = ContractNames.withdrawHandler;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_GVT_IN:
                eventType = 'Transfer';
                contractName = ContractNames.groVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_PWRD_IN:
                eventType = 'Transfer';
                contractName = ContractNames.powerD;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_GVT_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.groVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_PWRD_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.powerD;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_GRO_IN:
                eventType = 'Transfer';
                contractName = ContractNames.GroDAOToken;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_GRO_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.GroDAOToken;
                sender = account;
                receiver = null;
                break;
            // Avalanche
            case Transfer.DEPOSIT_USDCe:
                eventType = 'LogDeposit';
                contractName = ContractNames.AVAXUSDCVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_USDCe:
                eventType = 'LogWithdrawal';
                contractName = ContractNames.AVAXUSDCVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_USDCe_IN:
                eventType = 'Transfer';
                contractName = ContractNames.AVAXUSDCVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_USDCe_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.AVAXUSDCVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.DEPOSIT_USDTe:
                eventType = 'LogDeposit';
                contractName = ContractNames.AVAXUSDTVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_USDTe:
                eventType = 'LogWithdrawal';
                contractName = ContractNames.AVAXUSDTVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_USDTe_IN:
                eventType = 'Transfer';
                contractName = ContractNames.AVAXUSDTVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_USDTe_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.AVAXUSDTVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.DEPOSIT_DAIe:
                eventType = 'LogDeposit';
                contractName = ContractNames.AVAXDAIVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL_DAIe:
                eventType = 'LogWithdrawal';
                contractName = ContractNames.AVAXDAIVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_DAIe_IN:
                eventType = 'Transfer';
                contractName = ContractNames.AVAXDAIVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_DAIe_OUT:
                eventType = 'Transfer';
                contractName = ContractNames.AVAXDAIVault;
                sender = account;
                receiver = null;
                break;
            default:
                handleErr(`personalUtil->getTransferEvents2()->switch: Invalid event:`, side);
                return false;
        }

        const isAvax = (side >= 20 && side <= 31)
            ? true
            : false;

        let filters;
        if (isDepositOrWithdrawal(side)) {
            // returns an array
            filters = getContractHistoryEventFilters(
                'default',
                contractName,
                eventType,
                fromBlock,
                toBlock,
                [sender, receiver]
            );
        } else {
            // returns an object
            filters = getLatestContractEventFilter(
                'default',
                contractName,
                eventType,
                fromBlock,
                toBlock,
                [sender, receiver]
            );
            filters = [filters];
        }

        const logPromises = [];

        if (isAvax) {
            for (let i = 0; i < filters.length; i += 1) {
                const transferEventFilter = filters[i];
                const result = await getEvents(
                    transferEventFilter.filter,
                    transferEventFilter.interface,
                    getProviderAvax(),
                );
                if (result.length > 0) {
                    logPromises.push(result);
                }
            }
        } else {
            for (let i = 0; i < filters.length; i += 1) {
                const transferEventFilter = filters[i];
                const result = await getFilterEvents(
                    transferEventFilter.filter,
                    transferEventFilter.interface,
                    'default',
                );
                if (result.length > 0) {
                    logPromises.push(result);
                }
            }
        }

        let logResults = await Promise.all(logPromises);
        let logTrades = [];

        // Exclude mint or burn logs in transfers (sender or receiver address is 0x0)
        if (isTransfer(side) && logResults.length > 0) {
        // if (side > 2 && side < 20 && logResults.length > 0) {
            // if (side > 2 && side !== 9 && side !== 10 && logResults.length > 0) {
            for (let i = 0; i < logResults.length; i++) {
                // console.log('Event type:', eventType, 'side:', side, 'logs:', logResults[i]);
                for (let j = 0; j < logResults[i].length; j++) {
                    const elem = logResults[i][j];
                    // console.log('transfer type: ', eventType, 'element:', elem, 'args:', elem.args);
                    if (elem.args[0] !== '0x0000000000000000000000000000000000000000'
                        && elem.args[1] !== '0x0000000000000000000000000000000000000000') {
                        logTrades.push(elem);
                    }
                }
            }
            return (logTrades.length > 0) ? [logTrades] : [];
        } else {
            return logResults;
        }
    } catch (err) {
        handleErr(`personalUtil->getTransferEvents2() [side: ${side}]`, err);
        return false;
    }
};

//TODO: rename by getAmountFromTx?
const getGTokenFromTx = async (result, side, account) => {
    try {
        const numTx = result.length;
        logger.info(
            `**DB${account ? ' CACHE' : ''}: Processing ${numTx} ${side === Transfer.DEPOSIT ? 'deposit' : 'withdrawal'
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

                        // Update result array with the correct GTokens
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
        logger.info(
            `**DB${account ? ' CACHE' : ''}: ${result.length} ${sided} transaction${isPlural(numTx)} processed`
        );
        return result;
    } catch (err) {
        handleErr(`personalUtil->getGTokenFromTx() [transfer: ${side}]`, err);
    }
};

// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const getApprovalEvents2 = async (account, fromBlock, toBlock) => {
    try {
        const logApprovals = await getCoinApprovalFilters(
            'default',
            fromBlock,
            toBlock,
            account
        );
        const logPromises = [];
        for (let i = 0; i < logApprovals.length; i += 1) {
            const approvalEvent = logApprovals[i];
            logPromises.push(
                getFilterEvents(
                    approvalEvent.filter,
                    approvalEvent.interface,
                    'default'
                )
            );
        }
        const logs = await Promise.all(logPromises);

        // Remove approvals referring to deposits (only get stablecoin approvals)
        const depositTx = [];
        const q = account
            ? 'select_cache_tmp_deposits.sql'
            : 'select_tmp_deposits.sql';
        const res = await query(q, []);
        if (res.status === QUERY_ERROR) {
            return false;
        } else if (res.rows.length === 0) {
            logger.info(
                `**DB: Warning! 0 deposit transfers before processing approval events`
            );
        } else {
            for (const tx of res.rows) {
                depositTx.push(tx.tx_hash);
            }
        }
        let logsFiltered = [];
        for (let i = 0; i < logs.length; i++) {
            logsFiltered.push(logs[i].filter(
                (item) => !depositTx.includes(item.transactionHash)
            ));
        }

        return logsFiltered;
    } catch (err) {
        handleErr(
            `personalUtil->getApprovalEvents() [blocks: from ${fromBlock} to: ${toBlock}, account: ${account}]`,
            err
        );
        return false;
    }
};

export {
    QUERY_ERROR,
    getBlockData,
    getBlockDataAvax,
    getNetworkId,
    getStableCoinIndex,
    generateDateRange,
    calcLoadingDateRange,
    getApprovalEvents2,
    getTransferEvents2,
    getGTokenFromTx,
    handleErr,
    isInflow,
    isOutflow,
    isDepositOrWithdrawal,
    isPlural,
    transferType,
};
