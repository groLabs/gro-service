const ethers = require('ethers');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const {
    getDefaultProvider,
    getAlchemyRpcProvider,
} = require('../../common/chainUtil');
const { query } = require('../handler/queryHandler');
const {
    EVENT_TYPE,
    getEvents: getTransferEV,
    getApprovalEvents: getApprovalEV,
    // getDepositWithdrawEvents, // TESTING
} = require('../../common/logFilter');
const { QUERY_ERROR } = require('../constants');
const BlocksScanner = require('../../stats/common/blockscanner');
const provider = getAlchemyRpcProvider('stats_personal');
const scanner = new BlocksScanner(provider);


// TESTING
// const { getConfig } = require('../../common/configUtil');
// const depositHandlerHistoryConfig = getConfig('deposit_handler_history', false) || {};
// const withdrawHandlerHistoryConfig = getConfig('withdraw_handler_history', false) || {};
// const depositHandlerHistory = Object.keys(depositHandlerHistoryConfig);
// const withdrawHandlerHistory = Object.keys(withdrawHandlerHistoryConfig);
// console.log('depositHandlerHistory:', depositHandlerHistory);
// console.log('withdrawHandlerHistory:', withdrawHandlerHistory);



const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const isPlural = (count) => (count > 1) ? 's' : '';

const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
}

const Transfer = Object.freeze({
    "DEPOSIT": 1,
    "WITHDRAWAL": 2,
    "EXTERNAL_GVT_DEPOSIT": 3,
    "EXTERNAL_PWRD_DEPOSIT": 4,
    "EXTERNAL_GVT_WITHDRAWAL": 5,
    "EXTERNAL_PWRD_WITHDRAWAL": 6,
    "STABLECOIN_APPROVAL": 7,
});

const transferType = (side) => {
    switch (side) {
        case Transfer.DEPOSIT:
            return 'deposit';
        case Transfer.WITHDRAWAL:
            return 'withdrawal';
        case Transfer.EXTERNAL_GVT_DEPOSIT:
            return 'ext_gvt_deposit';
        case Transfer.EXTERNAL_PWRD_DEPOSIT:
            return 'ext_pwrd_deposit';
        case Transfer.EXTERNAL_GVT_WITHDRAWAL:
            return 'ext_gvt_withdrawal';
        case Transfer.EXTERNAL_PWRD_WITHDRAWAL:
            return 'ext_pwrd_withdrawal';
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
        default:
            break;
    }
}

const isDeposit = (side) => {
    return (side === Transfer.DEPOSIT
        || side === Transfer.EXTERNAL_GVT_DEPOSIT
        || side === Transfer.EXTERNAL_PWRD_DEPOSIT)
        ? true
        : false;
}

const getBlockData = async (blockNumber) => {
    const block = await getDefaultProvider()
        .getBlock(blockNumber)
        .catch((err) => {
            logger.error(err);
        });
    return block;
}

const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet': return 1;
            case 'ropsten': return 3;
            case 'kovan': return 42;
            //case 'develop': return TBC;
            //otherwise, raise exception
        }
        return -1;
    } catch (err) {
        logger.error(err);
    }
}

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
/// @param _fromDate Start date
/// @param _toDdate End date
/// @return An array with all dates from the start to the end date
const generateDateRange = (_fromDate, _toDate) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            logger.info('**DB: Date format is incorrect: should be "DD/MM/YYYY');
            return;
        }
        // Build array of dates
        const fromDate = moment.utc(_fromDate, "DD/MM/YYYY");
        const toDate = moment.utc(_toDate, "DD/MM/YYYY");
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
}

// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const getApprovalEvents2 = async (account, fromBlock, toBlock) => {
    try {
        const logs = await getApprovalEV(
            account,
            fromBlock,
            toBlock,
        ).catch((err) => {
            handleErr(`personalUtil->getApprovalEvents()->getApprovalEvents(): `, err);
            return false;
        });

        // TODO/QUESTION: only deposits from the same period, or any previous deposit?
        const depositTx = [];
        const q = (account)
            ? 'select_cache_tmp_deposits.sql'
            : 'select_tmp_deposits.sql';
        const res = await query(q, []);
        if (res.status === QUERY_ERROR) {
            return false;
        } else if (res.rows.length === 0) {
            logger.info(`**DB: Warning! 0 deposit transfers before processing approval events`);
        } else {
            for (const tx of res.rows) {
                depositTx.push(tx.tx_hash);
            }
        }

        // Remove approvals referring to deposits (only get stablecoin approvals)
        let logsFiltered = logs.filter((item) => !depositTx.includes(item.transactionHash));

        return logsFiltered;
    } catch (err) {
        handleErr(`personalUtil->getApprovalEvents() [blocks: from ${fromBlock} to: ${toBlock}, account: ${account}]`, err);
        return false;
    }
}

const getTransferEvents2 = async (side, fromBlock, toBlock, account) => {
    try {
        // Determine event type to apply filters
        let eventType;
        switch (side) {
            case Transfer.DEPOSIT:
                eventType = EVENT_TYPE.deposit;
                break;
            case Transfer.WITHDRAWAL:
                eventType = EVENT_TYPE.withdraw;
                break;
            case Transfer.EXTERNAL_GVT_DEPOSIT:
                eventType = EVENT_TYPE.inGvtTransfer;
                break;
            case Transfer.EXTERNAL_PWRD_DEPOSIT:
                eventType = EVENT_TYPE.inPwrdTransfer;
                break;
            case Transfer.EXTERNAL_GVT_WITHDRAWAL:
                eventType = EVENT_TYPE.outGvtTransfer;
                break;
            case Transfer.EXTERNAL_PWRD_WITHDRAWAL:
                eventType = EVENT_TYPE.outPwrdTransfer
                break;
            default:
                handleErr(`personalUtil->checkEventType()->switch: No valid event`, null);
                return false;
        };
        // Get all deposit or withdrawal events for a given block range
        const logs = await getTransferEV(
            eventType,
            fromBlock,
            toBlock,
            account,
        ).catch((err) => {
            handleErr(`personalUtil->checkEventType()->getEvents(): `, err);
            return false;
        });
        return logs;
    } catch (err) {
        handleErr(`personalUtil->checkEventType() [side: ${side}]`, err);
        return false;
    }
}

const getGTokenFromTx = async (result, side, account) => {
    try {
        const numTx = result.length;
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${numTx} ${(side === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal'} transaction${isPlural(numTx)}...`);

        // Interface for ERC20 token transfer
        const iface = new ethers.utils.Interface([
            "event Transfer(address indexed from, address indexed to, uint256 amount)",
        ]);

        // For all transactions -> for all logs -> retrieve GToken
        for (const item of result) {
            const txReceipt = await getDefaultProvider()
                .getTransactionReceipt(item.tx_hash)
                .catch((err) => {
                    console.log(err);
                });
            for (const log of txReceipt.logs) {
                // Only when signature is an ERC20 transfer: `Transfer(address from, address to, uint256 value)`
                if (log.topics[0] === ERC20_TRANSFER_SIGNATURE) {
                    const index = (side === Transfer.DEPOSIT) ? 1 : 2; // from is 0x0 : to is 0x0
                    // Only when a token is minted (from: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });
                        // Update result array with the correct GTokens
                        if (item.gvt_amount !== 0) {
                            item.gvt_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.gvt_amount = (side === Transfer.DEPOSIT) ? item.gvt_amount : -item.gvt_amount
                        } else {
                            item.pwrd_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.pwrd_amount = (side === Transfer.DEPOSIT) ? item.pwrd_amount : -item.pwrd_amount
                        }
                    }
                }
            }
        }
        logger.info(`**DB${account ? ' CACHE' : ''}: ${result.length} transaction${isPlural(numTx)} processed`);
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
    getApprovalEvents2,
    getTransferEvents2,
    getGTokenFromTx,
    handleErr,
    isDeposit,
    isPlural,
    Transfer,
    transferType,
}
