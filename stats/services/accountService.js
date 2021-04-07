'use strict';
const { ethers } = require('ethers');
const {
    getDepositHandler,
    getWithdrawHandler,
    getGvt: getGroVault,
    getPwrd: getPowerD,
} = require('../../contract/allContracts');
const { getDefaultProvider } = require('../../common/chainUtil');
const { ContractCallError } = require('../../common/customErrors');
const { CONTRACT_ASSET_DECIAML, div } = require('../../common/digitalUtil');
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const BN = require('bignumber.js');
const logger = require('../statsLogger');
const fromBlock = getConfig('blockchain.start_block');
const launchTime = getConfig('blockchain.launch_timestamp', false) || 0;
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

const EVENT_TYPE = {
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
    'event LogNewDeposit(address indexed user, address indexed referral, address gtoken, uint256 usdAmount, uint256[] tokens, bool whale)',
];
EVENT_FRAGMENT[EVENT_TYPE.withdraw] = [
    'event LogNewWithdrawal(address indexed user, address indexed referral, address gtoken, uint256 caseValue, uint256 usdAmount, uint256[] tokens, bool whale)',
];
EVENT_FRAGMENT[EVENT_TYPE.gvtTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount, uint256 factor)',
];
EVENT_FRAGMENT[EVENT_TYPE.pwrdTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount)',
];

const getEventInfo = function (log) {
    return {
        name: log.name,
        signature: log.signature,
        topic: log.topic,
        args: log.args,
    };
};

const getFilter = function (account, type) {
    const depositHandler = getDepositHandler();
    const withdrawHandler = getWithdrawHandler();
    const groVault = getGroVault();
    const powerD = getPowerD();
    let filter;
    switch (type) {
        case EVENT_TYPE.deposit:
            filter = depositHandler.filters.LogNewDeposit(account);
            break;
        case EVENT_TYPE.withdraw:
            filter = withdrawHandler.filters.LogNewWithdrawal(account);
            break;
        case EVENT_TYPE.inGvtTransfer:
            filter = groVault.filters.LogTransfer(null, account);
            break;
        case EVENT_TYPE.outGvtTransfer:
            filter = groVault.filters.LogTransfer(account);
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
};

const getDepositHistories = async function (account) {
    const provider = getDefaultProvider();
    const depositFilter = getFilter(account, EVENT_TYPE.deposit);
    if (!depositFilter) {
        throw new ContractCallError(
            `Get deposit filter for account:${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    }
    depositFilter.fromBlock = fromBlock;
    depositFilter.toBlock = 'latest';
    const depositLogs = await provider.getLogs(depositFilter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get deposit logs of ${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[EVENT_TYPE.deposit]
    );
    let logs = [];
    depositLogs.forEach((log) => {
        logs.push(getEventInfo(controllerInstance.parseLog(log)));
    });
    const result = { groVault: [], powerD: [] };
    if (!logs.length) return result;
    const groVaultAddress = getGroVault().address;
    logs.forEach((log) => {
        log.amount = new BN(log.args[3].toString());
        if (log.args[2] == groVaultAddress) {
            result.groVault.push(log);
        } else {
            result.powerD.push(log);
        }
    });
    return result;
};

const getWithdrawHistories = async function (account) {
    const provider = getDefaultProvider();
    const withdrawFilter = getFilter(account, EVENT_TYPE.withdraw);
    if (!withdrawFilter) {
        throw new ContractCallError(
            `Get withdraw filter for account:${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    }
    withdrawFilter.fromBlock = fromBlock;
    withdrawFilter.toBlock = 'latest';
    const withdrawLogs = await provider
        .getLogs(withdrawFilter)
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Get withdraw logs of ${account} failed.`,
                MESSAGE_TYPES.miniStatsPersonal
            );
        });
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[EVENT_TYPE.withdraw]
    );
    let logs = [];
    withdrawLogs.forEach((log) => {
        logs.push(getEventInfo(controllerInstance.parseLog(log)));
    });
    const result = { groVault: [], powerD: [] };
    if (!logs.length) return result;
    const groVaultAddress = getGroVault().address;
    logs.forEach((log) => {
        log.amount = new BN(log.args[4].toString());
        if (log.args[2] == groVaultAddress) {
            result.groVault.push(log);
        } else {
            result.powerD.push(log);
        }
    });
    return result;
};

const getTransferHistories = async function (account, filters, eventFragment) {
    const provider = getDefaultProvider();
    // in amount
    const inFilter = getFilter(account, filters[0]);
    if (!inFilter) {
        throw new ContractCallError(
            `Get transfer in filter for account:${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    }
    inFilter.fromBlock = fromBlock;
    inFilter.toBlock = 'latest';
    const inLogs = await provider.getLogs(inFilter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get groVault transfer in logs of ${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });
    const controllerInstance = new ethers.utils.Interface(eventFragment);
    let logs1 = [];
    inLogs.forEach((log) => {
        logs1.push(getEventInfo(controllerInstance.parseLog(log)));
    });

    // out amount
    const outFilter = getFilter(account, filters[1]);
    if (!inFilter) {
        throw new ContractCallError(
            `Get transfer out filter for account:${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    }
    outFilter.fromBlock = fromBlock;
    outFilter.toBlock = 'latest';
    const outLogs = await provider.getLogs(outFilter).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get groVault transfer out logs of ${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });
    let logs2 = [];
    outLogs.forEach((log) => {
        logs2.push(getEventInfo(controllerInstance.parseLog(log)));
    });
    return {
        deposit: logs1,
        withdraw: logs2,
    };
};

const getGroVaultTransferHistories = async function (account) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inGvtTransfer, EVENT_TYPE.outGvtTransfer],
        EVENT_FRAGMENT[EVENT_TYPE.gvtTransfer]
    );
    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIAML)
            .div(new BN(log.args[3].toString()));
    });
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIAML)
            .div(new BN(log.args[3].toString()));
    });
    return logs;
};

const getPowerDTransferHistories = async function (account) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inPwrdTransfer, EVENT_TYPE.outPwrdTransfer],
        EVENT_FRAGMENT[EVENT_TYPE.pwrdTransfer]
    );
    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString());
    });
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString());
    });
    return logs;
};

const getTransactionHistories = async function (account) {
    let promises = [];
    promises.push(getGroVaultTransferHistories(account));
    promises.push(getPowerDTransferHistories(account));
    promises.push(getDepositHistories(account));
    promises.push(getWithdrawHistories(account));
    let result = await Promise.all(promises);
    const powerD = result[1];
    const depositLogs = result[2];
    const groVault = result[0];
    const withdrawLogs = result[3];
    groVault.deposit.push(...depositLogs.groVault);
    powerD.deposit.push(...depositLogs.powerD);

    groVault.withdraw.push(...withdrawLogs.groVault);
    powerD.withdraw.push(...withdrawLogs.powerD);
    return { groVault, powerD };
};

const generateReport = async function (account) {
    let promises = [];
    promises.push(getTransactionHistories(account));
    promises.push(getDefaultProvider().getBlock());
    promises.push(getPowerD().getAssets(account));
    promises.push(getGroVault().getAssets(account));
    const results = await Promise.all(promises);
    const data = results[0];
    const latestBlock = results[1];
    const pwrdBalance = new BN(results[2].toString());
    const gvtBalance = new BN(results[3].toString());

    logger.info(`${account} historical: ${JSON.stringify(data)}`);
    const result = {
        current_timestamp: latestBlock.timestamp.toString(),
        launch_timestamp: launchTime,
        network: process.env.NODE_ENV,
        amount_added: {},
        amount_removed: {},
        net_amount_added: {},
        current_balance: {},
        net_returns: {},
        net_returns_ratio: {},
        address: account,
    };

    // calculate groVault deposit & withdraw
    let groVaultDepositAmount = new BN(0);
    let groVaultWithdrawAmount = new BN(0);
    data.groVault.deposit.forEach((log) => {
        groVaultDepositAmount = groVaultDepositAmount.plus(log.amount);
    });
    data.groVault.withdraw.forEach((log) => {
        groVaultWithdrawAmount = groVaultWithdrawAmount.plus(log.amount);
    });

    // calcuate powerd deposti & withdraw
    let powerDDepositAmount = new BN(0);
    let powerDWithdrawAmount = new BN(0);
    data.powerD.deposit.forEach((log) => {
        powerDDepositAmount = powerDDepositAmount.plus(log.amount);
    });
    data.powerD.withdraw.forEach((log) => {
        powerDWithdrawAmount = powerDWithdrawAmount.plus(log.amount);
    });
    // amount_added
    const depositAmount = powerDDepositAmount.plus(groVaultDepositAmount);
    result.amount_added.pwrd = div(
        powerDDepositAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.amount_added.gvt = div(
        groVaultDepositAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.amount_added.total = div(
        depositAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );

    // amount_removed
    const withdrawAmount = powerDWithdrawAmount.plus(groVaultWithdrawAmount);
    result.amount_removed.pwrd = div(
        powerDWithdrawAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.amount_removed.gvt = div(
        groVaultWithdrawAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.amount_removed.total = div(
        withdrawAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );

    // net_amount_added
    const netPwrdAmount = powerDDepositAmount.minus(powerDWithdrawAmount);
    const netGvtAmount = groVaultDepositAmount.minus(groVaultWithdrawAmount);
    const netTotal = depositAmount.minus(withdrawAmount);
    result.net_amount_added.pwrd = div(
        netPwrdAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.net_amount_added.gvt = div(
        netGvtAmount,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.net_amount_added.total = div(
        netTotal,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );

    // current_balance
    const totalBalance = pwrdBalance.plus(gvtBalance);
    result.current_balance.pwrd = div(
        pwrdBalance,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.current_balance.gvt = div(
        gvtBalance,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.current_balance.total = div(
        totalBalance,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );

    // net_returns
    const pwrdReturn = pwrdBalance.minus(netPwrdAmount);
    const gvtReturn = gvtBalance.minus(netGvtAmount);
    const totalReturn = pwrdReturn.plus(gvtReturn);
    result.net_returns.pwrd = div(
        pwrdReturn,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.net_returns.gvt = div(
        gvtReturn,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );
    result.net_returns.total = div(
        totalReturn,
        CONTRACT_ASSET_DECIAML,
        amountDecimal
    );

    // net_returns_ratio
    const pwrdRatio = pwrdReturn.eq(new BN(0))
        ? new BN(0)
        : pwrdReturn.div(netPwrdAmount);
    const gvtRatio = gvtReturn.eq(new BN(0))
        ? new BN(0)
        : gvtReturn.div(netGvtAmount);
    const totalRatio = totalReturn.eq(new BN(0))
        ? new BN(0)
        : totalReturn.div(netTotal);
    result.net_returns_ratio.pwrd = pwrdRatio.toFixed(ratioDecimal);
    result.net_returns_ratio.gvt = gvtRatio.toFixed(ratioDecimal);
    result.net_returns_ratio.total = totalRatio.toFixed(ratioDecimal);

    return result;
};

module.exports = {
    generateReport,
};
