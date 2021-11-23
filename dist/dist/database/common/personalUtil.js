"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferType = exports.Load = exports.Transfer = exports.isPlural = exports.isDeposit = exports.handleErr = exports.getGTokenFromTx = exports.getTransferEvents2 = exports.getApprovalEvents2 = exports.calcLoadingDateRange = exports.generateDateRange = exports.getStableCoinIndex = exports.getNetworkId = exports.getBlockData = exports.QUERY_ERROR = void 0;
const ethers_1 = __importDefault(require("ethers"));
const moment_1 = __importDefault(require("moment"));
const registry_1 = require("../../registry/registry");
const logFilter_new_1 = require("../../common/logFilter-new");
const filterGenerateTool_1 = require("../../common/filterGenerateTool");
const globalUtil_1 = require("./globalUtil");
const queryHandler_1 = require("../handler/queryHandler");
const constants_1 = require("../constants");
Object.defineProperty(exports, "QUERY_ERROR", { enumerable: true, get: function () { return constants_1.QUERY_ERROR; } });
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const isPlural = (count) => (count > 1 ? 's' : '');
exports.isPlural = isPlural;
const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
};
exports.handleErr = handleErr;
const Load = Object.freeze({
    FULL: 1,
    TRANSFERS: 2,
});
exports.Load = Load;
const Transfer = Object.freeze({
    DEPOSIT: 1,
    WITHDRAWAL: 2,
    TRANSFER_GVT_IN: 3,
    TRANSFER_PWRD_IN: 4,
    TRANSFER_GVT_OUT: 5,
    TRANSFER_PWRD_OUT: 6,
    STABLECOIN_APPROVAL: 7,
});
exports.Transfer = Transfer;
const transferType = (side) => {
    switch (side) {
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
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
        default:
            break;
    }
};
exports.transferType = transferType;
const isDeposit = (side) => {
    return side === Transfer.DEPOSIT ||
        side === Transfer.TRANSFER_GVT_IN ||
        side === Transfer.TRANSFER_PWRD_IN
        ? true
        : false;
};
exports.isDeposit = isDeposit;
const getBlockData = async (blockNumber) => {
    const block = await (0, globalUtil_1.getProvider)()
        .getBlock(blockNumber)
        .catch((err) => {
        logger.error(err);
    });
    return block;
};
exports.getBlockData = getBlockData;
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
    }
    catch (err) {
        logger.error(err);
    }
};
exports.getNetworkId = getNetworkId;
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
exports.getStableCoinIndex = getStableCoinIndex;
/// @notice Generates a collection of dates from a given start date to an end date
/// @param _fromDate Start date [date format: 'DD/MM/YYYY]
/// @param _toDdate End date [date format: 'DD/MM/YYYY]
/// @return An array with all dates from the start to the end date
const generateDateRange = (_fromDate, _toDate) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            logger.info('**DB: Date format is incorrect: should be "DD/MM/YYYY');
            return;
        }
        // Build array of dates
        const fromDate = moment_1.default.utc(_fromDate, 'DD/MM/YYYY');
        const toDate = moment_1.default.utc(_toDate, 'DD/MM/YYYY');
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
    }
    catch (err) {
        handleErr(`personalUtil->generateDateRange() [from: ${_fromDate}, to: ${_toDate}]`, err);
    }
};
exports.generateDateRange = generateDateRange;
/// @notice Calculate the start and end date to load personal stats based on the last
///         successful load
/// @dev    - personal stats are only loaded when a day is completed, so the latest
///         possible day to be loaded will always D-1 (yesterday), but never the current day
///         - Last successful load is retrieved from table SYS_USER_LOADS
/// @return An array with the start and end date to load personal stats
///         eg: ['21/10/2021', '24/10/2021']
const calcLoadingDateRange = async () => {
    try {
        const res = await (0, queryHandler_1.query)('select_last_user_load.sql', []);
        if (res.status === constants_1.QUERY_ERROR || res.rows.length === 0 || !res.rows[0].max_user_date) {
            if (res.rows.length === 0 || !res.rows[0].max_user_date)
                logger.error('**DB: No dates found in DB to load personal stats');
            return [];
        }
        else {
            const lastLoad = moment_1.default
                .utc(res.rows[0].max_user_date)
                .add(1, 'days')
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
            const yesterday = moment_1.default
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
    }
    catch (err) {
        handleErr(`personalUtil->generateLoadingDateRange()`, err);
        return [];
    }
};
exports.calcLoadingDateRange = calcLoadingDateRange;
// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const getApprovalEvents2 = async (account, fromBlock, toBlock) => {
    try {
        const logApprovals = await (0, filterGenerateTool_1.getCoinApprovalFilters)('default', fromBlock, toBlock, account);
        const logPromises = [];
        for (let i = 0; i < logApprovals.length; i += 1) {
            const approvalEvent = logApprovals[i];
            logPromises.push((0, logFilter_new_1.getFilterEvents)(approvalEvent.filter, approvalEvent.interface, 'default'));
        }
        const logs = await Promise.all(logPromises);
        // Remove approvals referring to deposits (only get stablecoin approvals)
        const depositTx = [];
        const q = account
            ? 'select_cache_tmp_deposits.sql'
            : 'select_tmp_deposits.sql';
        const res = await (0, queryHandler_1.query)(q, []);
        if (res.status === constants_1.QUERY_ERROR) {
            return false;
        }
        else if (res.rows.length === 0) {
            logger.info(`**DB: Warning! 0 deposit transfers before processing approval events`);
        }
        else {
            for (const tx of res.rows) {
                depositTx.push(tx.tx_hash);
            }
        }
        let logsFiltered = [];
        for (let i = 0; i < logs.length; i++) {
            logsFiltered.push(logs[i].filter((item) => !depositTx.includes(item.transactionHash)));
        }
        return logsFiltered;
    }
    catch (err) {
        handleErr(`personalUtil->getApprovalEvents() [blocks: from ${fromBlock} to: ${toBlock}, account: ${account}]`, err);
        return false;
    }
};
exports.getApprovalEvents2 = getApprovalEvents2;
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
                contractName = registry_1.ContractNames.depositHandler;
                sender = account;
                receiver = null;
                break;
            case Transfer.WITHDRAWAL:
                eventType = 'LogNewWithdrawal';
                contractName = registry_1.ContractNames.withdrawHandler;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_GVT_IN:
                eventType = 'Transfer';
                contractName = registry_1.ContractNames.groVault;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_PWRD_IN:
                eventType = 'Transfer';
                contractName = registry_1.ContractNames.powerD;
                sender = null;
                receiver = account;
                break;
            case Transfer.TRANSFER_GVT_OUT:
                eventType = 'Transfer';
                contractName = registry_1.ContractNames.groVault;
                sender = account;
                receiver = null;
                break;
            case Transfer.TRANSFER_PWRD_OUT:
                eventType = 'Transfer';
                contractName = registry_1.ContractNames.powerD;
                sender = account;
                receiver = null;
                break;
            default:
                handleErr(`personalUtil->getTransferEvents2()->switch: Invalid event`, null);
                return false;
        }
        let events;
        if (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) {
            // returns an array
            events = (0, filterGenerateTool_1.getContractHistoryEventFilters)('default', contractName, eventType, fromBlock, toBlock, [sender, receiver]);
        }
        else {
            // returns an object
            events = (0, filterGenerateTool_1.getLatestContractEventFilter)('default', contractName, eventType, fromBlock, toBlock, [sender, receiver]);
            events = [events];
        }
        const logPromises = [];
        for (let i = 0; i < events.length; i += 1) {
            const transferEventFilter = events[i];
            const result = await (0, logFilter_new_1.getFilterEvents)(transferEventFilter.filter, transferEventFilter.interface, 'default');
            if (result.length > 0) {
                logPromises.push(result);
            }
        }
        let logResults = await Promise.all(logPromises);
        let logTrades = [];
        // Exclude mint or burn logs in transfers (sender or receiver address is 0x0)
        if (side > 2 && side < 7 && logResults.length > 0) {
            for (let i = 0; i < logResults.length; i++) {
                //console.log('Event type:', eventType, 'side:', side, 'logs:', logResults[i], 'args:');
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
        }
        else {
            return logResults;
        }
        //console.log('side', side, 'logResults', logResults[0][0]);
    }
    catch (err) {
        handleErr(`personalUtil->getTransferEvents2() [side: ${side}]`, err);
        return false;
    }
};
exports.getTransferEvents2 = getTransferEvents2;
const getGTokenFromTx = async (result, side, account) => {
    try {
        const numTx = result.length;
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${numTx} ${side === Transfer.DEPOSIT ? 'deposit' : 'withdrawal'} transaction${isPlural(numTx)}...`);
        // Interface for ERC20 token transfer
        const iface = new ethers_1.default.utils.Interface([
            'event Transfer(address indexed from, address indexed to, uint256 amount)',
        ]);
        // For all transactions -> for all logs -> retrieve GToken
        for (const item of result) {
            const txReceipt = await (0, globalUtil_1.getProvider)()
                .getTransactionReceipt(item.tx_hash)
                .catch((err) => {
                console.log(err);
            });
            for (const log of txReceipt.logs) {
                // Only when signature is an ERC20 transfer: `Transfer(address from, address to, uint256 value)`
                if (log.topics[0] === constants_1.ERC20_TRANSFER_SIGNATURE) {
                    const index = (side === Transfer.DEPOSIT)
                        ? 1 // from is 0x0
                        : 2; // to is 0x0
                    // Only when a token is minted (from: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });
                        // Update result array with the correct GTokens
                        if (item.gvt_amount !== 0) {
                            item.gvt_amount = parseFloat(ethers_1.default.utils.formatEther(output.args[2]));
                            item.gvt_amount =
                                side === Transfer.DEPOSIT
                                    ? item.gvt_amount
                                    : -item.gvt_amount;
                        }
                        else {
                            item.pwrd_amount = parseFloat(ethers_1.default.utils.formatEther(output.args[2]));
                            item.pwrd_amount =
                                side === Transfer.DEPOSIT
                                    ? item.pwrd_amount
                                    : -item.pwrd_amount;
                        }
                    }
                }
            }
        }
        const sided = (side === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal';
        logger.info(`**DB${account ? ' CACHE' : ''}: ${result.length} ${sided} transaction${isPlural(numTx)} processed`);
        return result;
    }
    catch (err) {
        handleErr(`personalUtil->getGTokenFromTx() [transfer: ${side}]`, err);
    }
};
exports.getGTokenFromTx = getGTokenFromTx;
