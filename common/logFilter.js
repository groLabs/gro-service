const { ethers } = require('ethers');
const {
    getDepositHandler,
    getWithdrawHandler,
    getGvt: getGroVault,
    getPwrd: getPowerD,
    getUnderlyTokens,
} = require('../contract/allContracts');
const { ContractCallError } = require('./error');
const { getAlchemyRpcProvider } = require('./chainUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const EVENT_TYPE = {
    stabeCoinApprove: 'coin-approve',
    deposit: 'deposit',
    withdraw: 'withdraw',
    gvtTransfer: 'gvtTransfer',
    inGvtTransfer: 'transfer-gvt-in',
    outGvtTransfer: 'transfer-gvt-out',
    pwrdTransfer: 'pwrdTransfer',
    inPwrdTransfer: 'transfer-pwrd-in',
    outPwrdTransfer: 'transfer-pwrd-out',
};

const EVENT_FRAGMENT = {};
EVENT_FRAGMENT[EVENT_TYPE.deposit] = [
    'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[] tokens)',
];
EVENT_FRAGMENT[EVENT_TYPE.withdraw] = [
    'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[] tokenAmounts)',
];
EVENT_FRAGMENT[EVENT_TYPE.gvtTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount, uint256 factor)',
];
EVENT_FRAGMENT[EVENT_TYPE.inGvtTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount, uint256 factor)',
];
EVENT_FRAGMENT[EVENT_TYPE.outGvtTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount, uint256 factor)',
];
EVENT_FRAGMENT[EVENT_TYPE.pwrdTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount)',
];
EVENT_FRAGMENT[EVENT_TYPE.inPwrdTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount)',
];
EVENT_FRAGMENT[EVENT_TYPE.outPwrdTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount)',
];
EVENT_FRAGMENT[EVENT_TYPE.stabeCoinApprove] = [
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

async function getStabeCoinApprovalFilters(account, providerKey) {
    const stablecoins = getUnderlyTokens(providerKey);
    const spender = getDepositHandler(providerKey).address;
    const approvalFilters = [];
    for (let i = 0; i < stablecoins.length; i += 1) {
        approvalFilters.push(stablecoins[i].filters.Approval(account, spender));
    }
    return approvalFilters;
}

function getFilter(account, type, providerKey) {
    const depositHandler = getDepositHandler(providerKey);
    const withdrawHandler = getWithdrawHandler(providerKey);
    const groVault = getGroVault(providerKey);
    const powerD = getPowerD(providerKey);
    let filter;
    switch (type) {
        case EVENT_TYPE.deposit:
            filter = depositHandler.filters.LogNewDeposit(account);
            break;
        case EVENT_TYPE.withdraw:
            filter = withdrawHandler.filters.LogNewWithdrawal(account);
            break;
        case EVENT_TYPE.gvtTransfer:
            filter = groVault.filters.LogTransfer(null, null);
            break;
        case EVENT_TYPE.inGvtTransfer:
            filter = groVault.filters.LogTransfer(null, account);
            break;
        case EVENT_TYPE.outGvtTransfer:
            filter = groVault.filters.LogTransfer(account);
            break;
        case EVENT_TYPE.pwrdTransfer:
            filter = powerD.filters.LogTransfer(null, null);
            break;
        case EVENT_TYPE.inPwrdTransfer:
            filter = powerD.filters.LogTransfer(null, account);
            break;
        case EVENT_TYPE.outPwrdTransfer:
            filter = powerD.filters.LogTransfer(account);
            break;
        default:
            logger.error(`No type: ${type}`);
    }
    return filter;
}

async function getEventsByFilter(filter, eventType, providerKey) {
    const provider = getAlchemyRpcProvider(providerKey);
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(`Get ${eventType} logs failed.`);
    });
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[eventType]
    );
    const logs = [];
    filterLogs.forEach((log) => {
        const eventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        const parseResult = controllerInstance.parseLog(log);
        eventInfo.name = parseResult.name;
        eventInfo.signature = parseResult.signature;
        eventInfo.topic = parseResult.topic;
        eventInfo.args = parseResult.args;
        logs.push(eventInfo);
    });

    return logs;
}

async function getApprovalEvents(
    account,
    fromBlock,
    toBlock = 'latest',
    providerKey
) {
    const filters = await getStabeCoinApprovalFilters(account, providerKey);
    const logs = [];
    const approvalLogsPromise = [];
    for (let i = 0; i < filters.length; i += 1) {
        const filter = filters[i];
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        approvalLogsPromise.push(
            getEventsByFilter(filter, EVENT_TYPE.stabeCoinApprove, providerKey)
        );
    }
    const promiseResult = await Promise.all(approvalLogsPromise);
    for (let i = 0; i < promiseResult.length; i += 1) {
        logs.push(...promiseResult[i]);
    }
    return logs;
}

async function getEvents(
    eventType,
    fromBlock,
    toBlock = 'latest',
    account = null,
    providerKey
) {
    const filter = getFilter(account, eventType, providerKey);
    if (!filter) {
        throw new ContractCallError(
            `Get ${eventType} filter for account:${account || 'All'} failed.`
        );
    }
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const logs = await getEventsByFilter(filter, eventType, providerKey);
    return logs;
}

async function getTransferEvents(
    eventType,
    fromBlock,
    toBlock = 'latest',
    account = null,
    providerKey
) {
    const filter = getFilter(account, eventType, providerKey);
    if (!filter) {
        throw new ContractCallError(
            `Get ${eventType} event logs of account:${account || 'All'} failed.`
        );
    }
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const provider = getAlchemyRpcProvider(providerKey);
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get ${eventType} event logs of ${account || 'all users'} failed.`
        );
    });
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[eventType]
    );
    const logs = [];
    filterLogs.forEach((log) => {
        const eventInfo = {
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        const parseResult = controllerInstance.parseLog(log);
        eventInfo.name = parseResult.name;
        eventInfo.signature = parseResult.signature;
        eventInfo.topic = parseResult.topic;
        eventInfo.args = parseResult.args;
        logs.push(eventInfo);
    });

    return logs;
}

module.exports = {
    EVENT_TYPE,
    getEvents,
    getTransferEvents,
    getApprovalEvents,
};
