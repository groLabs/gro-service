// @ts-nocheck
import { ethers } from 'ethers';
import { getDepositHandler, getWithdrawHandler, getGvt as getGroVault, getPwrd as getPowerD, getUnderlyTokens } from '../contract/allContracts';
import { ContractCallError } from './error';
import { getDefaultProvider } from './chainUtil';
import { getConfig } from './configUtil';
import { EventInfo } from './commonTypes'
const depositHandlerABI = require('../contract/abis/DepositHandler.json');
const withdrawHandlerABI = require('../contract/abis/WithdrawHandler.json');

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const EVENT_TYPE = {
    stableCoinApprove: 'coin-approve',
    deposit: 'deposit',
    withdraw: 'withdraw',
    gvtTransfer: 'gvtTransfer',
    inGvtTransfer: 'transfer-gvt-in',
    outGvtTransfer: 'transfer-gvt-out',
    pwrdTransfer: 'pwrdTransfer',
    inPwrdTransfer: 'transfer-pwrd-in',
    outPwrdTransfer: 'transfer-pwrd-out',
    pnl: 'pnl',
};

const EVENT_FRAGMENT = {};
EVENT_FRAGMENT[EVENT_TYPE.deposit] = [
    'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[3] tokens)',
];
EVENT_FRAGMENT[EVENT_TYPE.withdraw] = [
    'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[3] tokenAmounts)',
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
EVENT_FRAGMENT[EVENT_TYPE.stableCoinApprove] = [
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
];
//@ts-ignore
EVENT_FRAGMENT[EVENT_TYPE.strategyHarvest] = [
    'event Harvested(uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding);',
];
//@ts-ignore
EVENT_FRAGMENT[EVENT_TYPE.vaultTransfer] = [
    'event Transfer(address indexed sender, address indexed recipient, uint256 value)',
];
EVENT_FRAGMENT[EVENT_TYPE.pnl] = [
    'event LogPnLExecution(uint256 deductedAssets,int256 totalPnL,int256 investPnL,int256 pricePnL,uint256 withdrawalBonus,uint256 performanceBonus,uint256 beforeGvtAssets,uint256 beforePwrdAssets,uint256 afterGvtAssets,uint256 afterPwrdAssets)',
];

async function getStableCoinApprovalFilters(account, providerKey) {
    const stablecoins = getUnderlyTokens(providerKey);
    const spender = getDepositHandler(providerKey).address;
    const approvalFilters: any = [];
    for (let i = 0; i < stablecoins.length; i += 1) {
        approvalFilters.push(stablecoins[i].filters.Approval(account, spender));
    }
    return approvalFilters;
}

async function getGTokenApprovalFilters(account, providerKey) {
    const groVault = getGroVault(providerKey);
    const pwrd = getPowerD(providerKey);
    const approvalFilters: any = [];
    approvalFilters.push(groVault.filters.Approval(account, null));
    approvalFilters.push(pwrd.filters.Approval(account, null));
    return approvalFilters;
}

function getDepositWithdrawFilter(account, type, handlerAddresses) {
    logger.info(
        `type: ${type}, handlerAddresses: ${JSON.stringify(handlerAddresses)}`
    );
    let handler;
    let handlerAddress;
    const filters: any = [];
    for (let i = 0; i < handlerAddresses.length; i += 1) {
        handlerAddress = handlerAddresses[i];
        let handlerABI = (getConfig(`${type}_handler_history`) as any)[handlerAddress];
        logger.info(`handlerAddress: ${JSON.stringify(handlerAddress)}`);
        handlerABI = handlerABI.abi;
        const abiVersion = handlerABI ? `-${handlerABI}` : '';
        logger.info(
            `handlerAddress: ${handlerAddress}; abiVersion: ${abiVersion}`
        );
        switch (type) {
            case EVENT_TYPE.deposit:
                handler = new ethers.Contract(
                    handlerAddress,
                    require(`../contract/abis/DepositHandler${abiVersion}.json`)
                );
                filters.push(handler.filters.LogNewDeposit(account));
                break;
            case EVENT_TYPE.withdraw:
                handler = new ethers.Contract(
                    handlerAddress,
                    require(`../contract/abis/WithdrawHandler${abiVersion}.json`)
                );
                filters.push(handler.filters.LogNewWithdrawal(account));
                break;
            default:
                logger.error(`No type: ${type}`);
        }
    }
    if (filters.length) return filters;

    switch (type) {
        case EVENT_TYPE.deposit:
            handlerAddress = getDepositHandler().address;
            handler = new ethers.Contract(handlerAddress, depositHandlerABI);
            filters.push(handler.filters.LogNewDeposit(account));
            break;
        case EVENT_TYPE.withdraw:
            handlerAddress = getWithdrawHandler().address;
            handler = new ethers.Contract(handlerAddress, withdrawHandlerABI);
            filters.push(handler.filters.LogNewWithdrawal(account));
            break;
        default:
            logger.error(`No type: ${type}`);
    }
    return filters;
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

async function getEventsByFilter(
    filter,
    eventType,
    providerKey,
    specialEventFragment?
) {
    const provider = getDefaultProvider();
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(`Get ${eventType} logs failed.`);
    });
    const fragment = specialEventFragment || EVENT_FRAGMENT[eventType];
    const controllerInstance = new ethers.utils.Interface(fragment);
    const logs: any = [];
    filterLogs.forEach((log) => {
        const eventInfo: EventInfo = {
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
    const stableCoinFilters = await getStableCoinApprovalFilters(
        account,
        providerKey
    );
    const gtokenFilters = await getGTokenApprovalFilters(account, providerKey);
    const filters = [...stableCoinFilters, ...gtokenFilters];
    const logs: any = [];
    const approvalLogsPromise: any = [];
    for (let i = 0; i < filters.length; i += 1) {
        const filter = filters[i];
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        approvalLogsPromise.push(
            getEventsByFilter(filter, EVENT_TYPE.stableCoinApprove, providerKey)
        );
    }
    const promiseResult: any = await Promise.all(approvalLogsPromise);
    for (let i = 0; i < promiseResult.length; i += 1) {
        logs.push(...promiseResult[i]);
    }
    return logs;
}

async function getDepositWithdrawEvents(
    eventType,
    fromBlock,
    toBlock = 'latest',
    account = null,
    providerKey,
    handlerAddresses
) {
    const filters = getDepositWithdrawFilter(
        account,
        eventType,
        handlerAddresses
    );
    const logs: any = [];
    const eventsPromise: any = [];
    for (let i = 0; i < filters.length; i += 1) {
        const handlerAddress = handlerAddresses[i];
        let eventFragment;
        if (handlerAddress) {
            eventFragment = (getConfig(`${eventType}_handler_history`) as any)[
                handlerAddress
            ].event_fragment;
        }

        const filter = filters[i];
        filter.fromBlock = fromBlock;
        filter.toBlock = toBlock;
        eventsPromise.push(
            getEventsByFilter(filter, eventType, providerKey, eventFragment)
        );
    }
    const promiseResult: any = await Promise.all(eventsPromise);
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
    const provider = getDefaultProvider();
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get ${eventType} event logs of ${account || 'all users'} failed.`
        );
    });
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[eventType]
    );
    const logs: any = [];
    filterLogs.forEach((log) => {
        const eventInfo: EventInfo = {
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

async function getStrategyHavestEvents(
    strategy,
    fromBlock,
    toBlock,
    providerKey
) {
    logger.info(`from ${fromBlock} to ${toBlock}`);
    const filter = await strategy.filters.Harvested();
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const provider = getDefaultProvider();
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(`Get StrategyHavest logs failed.`);
    });
    const logs: any = [];
    filterLogs.forEach((log) => {
        logger.info(
            `getStrategyHavestEvents ${log.address} ${log.blockNumber}`
        );
        const eventInfo: EventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        logs.push(eventInfo);
    });
    return logs;
}

async function getVaultTransferEvents(
    vault,
    fromBlock,
    toBlock = 'latest',
    providerKey
) {
    const filter = await vault.filters.Transfer(
        null,
        '0x0000000000000000000000000000000000000000'
    );
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const provider = getDefaultProvider();
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(`Get VaultTransfer logs failed.`);
    });
    const logs: any = [];
    filterLogs.forEach((log) => {
        logger.info(`getVaultTransferEvents ${log.address} ${log.blockNumber}`);
        const eventInfo: EventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        logs.push(eventInfo);
    });
    return logs;
}

async function getPnLEvents(pnl, fromBlock, toBlock = 'latest', providerKey) {
    const filter = await pnl.filters.LogPnLExecution();
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const provider = getDefaultProvider();
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(`Get getPnLEvents logs failed.`);
    });
    const pnlInterface = new ethers.utils.Interface(
        EVENT_FRAGMENT[EVENT_TYPE.pnl]
    );
    const logs: any = [];
    filterLogs.forEach((log) => {
        logger.info(`getPnLEvents ${log.address} ${log.blockNumber}`);
        const eventInfo: EventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        const parseResult = pnlInterface.parseLog(log);
        eventInfo.name = parseResult.name;
        eventInfo.signature = parseResult.signature;
        eventInfo.topic = parseResult.topic;
        eventInfo.args = parseResult.args;
        logs.push(eventInfo);
    });
    return logs;
}

export {
    EVENT_TYPE,
    getEvents,
    getTransferEvents,
    getApprovalEvents,
    getStrategyHavestEvents,
    getVaultTransferEvents,
    getPnLEvents,
    getDepositWithdrawEvents,
};

