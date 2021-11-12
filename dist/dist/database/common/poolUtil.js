// ** CLEANSE MODULES NOT USED **
const ethers = require('ethers');
const moment = require('moment');
const { ContractNames } = require('../../registry/registry');
const { getFilterEvents } = require('../../dist/common/logFilter-new');
const { getLatestContractEventFilter, getContractHistoryEventFilters, getCoinApprovalFilters, } = require('../../dist/common/filterGenerateTool');
const { loadContractInfoFromRegistry } = require('../../registry/registryLoader');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getProvider } = require('./globalUtil');
const { query } = require('../handler/queryHandler');
const { EVENT_TYPE, getEvents: getTransferEV, getApprovalEvents: getApprovalEV, } = require('../../dist/common/logFilter');
const { QUERY_ERROR, ERC20_TRANSFER_SIGNATURE } = require('../constants');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const isPlural = (count) => (count > 1 ? 's' : '');
const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
};
const Transfer = Object.freeze({
    DEPOSIT: 1,
    WITHDRAWAL: 2,
    EXTERNAL_GRO_GVT_DEPOSIT: 3,
    EXTERNAL_GRO_GVT_WITHDRAWAL: 4,
    STABLECOIN_APPROVAL: 5,
});
const transferType = (side) => {
    switch (side) {
        case Transfer.DEPOSIT:
            return 'deposit';
        case Transfer.WITHDRAWAL:
            return 'withdrawal';
        case Transfer.EXTERNAL_GRO_GVT_DEPOSIT:
            return 'external-gro-gvt-deposit';
        case Transfer.EXTERNAL_GRO_GVT_DEPOSIT:
            return 'external-gro-gvt-withdrawal';
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
        default:
            break;
    }
};
const isDeposit = (side) => {
    return side === Transfer.DEPOSIT ||
        side === Transfer.EXTERNAL_GRO_GVT_DEPOSIT
        ? true
        : false;
};
const getTransferEvents3 = async (side, fromBlock, toBlock, account) => {
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
            case Transfer.EXTERNAL_GRO_GVT_DEPOSIT:
                eventType = 'LogTransfer';
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
            default:
                handleErr(`poolUtil->checkEventType()->switch: Invalid event`, null);
                return false;
        }
        let events;
        if (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) {
            // returns an array
            events = getContractHistoryEventFilters('default', contractName, eventType, fromBlock, toBlock, [sender, receiver]);
        }
        else {
            // returns an object
            events = getLatestContractEventFilter('default', contractName, eventType, fromBlock, toBlock, [sender, receiver]);
            events = [events];
        }
        const logPromises = [];
        for (let i = 0; i < events.length; i += 1) {
            const transferEventFilter = events[i];
            logPromises.push(getFilterEvents(transferEventFilter.filter, transferEventFilter.interface, 'default'));
        }
        let logResults = await Promise.all(logPromises);
        // Exclude burn or mint events
        let logTrades = [];
        if (side > 2 && side < 5) {
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
    }
    catch (err) {
        handleErr(`poolUtil->poolUtil() [side: ${side}]`, err);
        return false;
    }
};
