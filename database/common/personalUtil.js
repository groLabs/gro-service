const ethers = require('ethers');
const moment = require('moment');
const { ContractNames } = require('../../registry/registry');
const { getFilterEvents } = require('../../common/logFilter-new');
const {
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
    getCoinApprovalFilters,
} = require('../../common/filterGenerateTool');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getProvider } = require('./globalUtil')
const { query } = require('../handler/queryHandler');
const {
    QUERY_ERROR,
    ERC20_TRANSFER_SIGNATURE
} = require('../constants');


const ZERO_ADDRESS =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

const isPlural = (count) => (count > 1 ? 's' : '');

const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
};

const Transfer = Object.freeze({
    DEPOSIT: 1,
    WITHDRAWAL: 2,
    EXTERNAL_GVT_DEPOSIT: 3,
    EXTERNAL_PWRD_DEPOSIT: 4,
    EXTERNAL_GVT_WITHDRAWAL: 5,
    EXTERNAL_PWRD_WITHDRAWAL: 6,
    STABLECOIN_APPROVAL: 7,
});

const transferType = (side) => {
    switch (side) {
        case Transfer.DEPOSIT:
            return 'deposit';
        case Transfer.WITHDRAWAL:
            return 'withdrawal';
        case Transfer.EXTERNAL_GVT_DEPOSIT:
            return 'transfer-gvt-in';
        case Transfer.EXTERNAL_PWRD_DEPOSIT:
            return 'transfer-pwrd-in';
        case Transfer.EXTERNAL_GVT_WITHDRAWAL:
            return 'transfer-gvt-out';
        case Transfer.EXTERNAL_PWRD_WITHDRAWAL:
            return 'transfer-pwrd-out';
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
        default:
            break;
    }
};

const isDeposit = (side) => {
    return side === Transfer.DEPOSIT ||
        side === Transfer.EXTERNAL_GVT_DEPOSIT ||
        side === Transfer.EXTERNAL_PWRD_DEPOSIT
        ? true
        : false;
};

const getBlockData = async (blockNumber) => {
    const block = await getProvider()
        .getBlock(blockNumber)
        .catch((err) => {
            logger.error(err);
        });
    return block;
};

const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet':
                return 1;
            case 'ropsten':
                return 3;
            case 'kovan':
                return 42;
            //case 'develop': return TBC;
            //otherwise, raise exception
        }
        return -1;
    } catch (err) {
        logger.error(err);
    }
};

// DUPLICATED: to be moved to /common
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
        handleErr(
            `personalUtil->generateDateRange() [from: ${_fromDate}, to: ${_toDate}]`,
            err
        );
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

const getTransferEvents2 = async (side, fromBlock, toBlock, account) => {
    try {
        // Determine event type to apply filters
        let eventType;
        let contractName;
        let sender;
        let receiver;
        switch (side) {
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
            case Transfer.EXTERNAL_GVT_DEPOSIT:  // Rename TRANSFER_GVT_IN
                eventType = 'Transfer';
                contractName = ContractNames.groVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.EXTERNAL_PWRD_DEPOSIT:  // Rename TRANSFER_PWRD_IN
                eventType = 'Transfer';
                contractName = ContractNames.powerD;
                sender = null;
                receiver = account;
                break;
            case Transfer.EXTERNAL_GVT_WITHDRAWAL:  // Rename TRANSFER_GVT_OUT
                eventType = 'Transfer';
                contractName = ContractNames.groVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.EXTERNAL_PWRD_WITHDRAWAL:   // Rename TRANSFER_PWRD_OUT
                eventType = 'Transfer';
                contractName = ContractNames.powerD;
                sender = account;
                receiver = null;
                break;
            default:
                handleErr(
                    `personalUtil->getTransferEvents2()->switch: Invalid event`,
                    null
                );
                return false;
        }

        let events;
        if (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) {
            // returns an array
            events = getContractHistoryEventFilters(
                'default',
                contractName,
                eventType,
                fromBlock,
                toBlock,
                [sender, receiver]
            );
        } else {
            // returns an object
            events = getLatestContractEventFilter(
                'default',
                contractName,
                eventType,
                fromBlock,
                toBlock,
                [sender, receiver]
            );
            events = [events];
        }

        const logPromises = [];

        for (let i = 0; i < events.length; i += 1) {
            const transferEventFilter = events[i];
            const result = await getFilterEvents(
                transferEventFilter.filter,
                transferEventFilter.interface,
                'default'
            );
            if (result.length > 0) {
                logPromises.push(result);
            }
        }
        let logResults = await Promise.all(logPromises);


        let logTrades = [];
        if (side > 2 && side < 7) {
            for (let i = 0; i < logResults.length; i++) {
                //console.log('Event type:', eventType, 'side:', side, 'logs:', logResults[i], 'args:');
                for (let j = 0; j < logResults[i].length; j++) {
                    const elem = logResults[i][j];
                    //console.log('transfer type: ', eventType, 'element:', elem, 'args:', elem.args);
                    // Exclude events that are mint or burn (sender or receiver address is 0x0) only for transfers
                    if (elem.args[0] !== '0x0000000000000000000000000000000000000000'
                        && elem.args[1] !== '0x0000000000000000000000000000000000000000') {
                        logTrades.push(elem);

                    }
                }
            }
            logResults = [logTrades];
        }

        return logResults;
    } catch (err) {
        handleErr(`personalUtil->getTransferEvents2() [side: ${side}]`, err);
        return false;
    }
};

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

                    // Only when a token is minted (from: 0x)
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
        logger.info(
            `**DB${account ? ' CACHE' : ''}: ${result.length
            } transaction${isPlural(numTx)} processed`
        );
        return result;
    } catch (err) {
        handleErr(`personalUtil->getGTokenFromTx() [transfer: ${side}]`, err);
    }
};

module.exports = {
    QUERY_ERROR,
    getBlockData,
    getNetworkId,
    getStableCoinIndex,
    generateDateRange,
    calcLoadingDateRange,
    getApprovalEvents2,
    getTransferEvents2,
    getGTokenFromTx,
    handleErr,
    isDeposit,
    isPlural,
    Transfer,
    transferType,
};
