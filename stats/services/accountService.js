const BN = require('bignumber.js');
const logger = require('../statsLogger');
const {
    getGvt: getGroVault,
    getPwrd: getPowerD,
} = require('../../contract/allContracts');
const {
    EVENT_TYPE,
    getEvents,
    getTransferEvents,
} = require('../../common/logFilter');
const { getDefaultProvider } = require('../../common/chainUtil');
const { ContractCallError } = require('../../common/error');
const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const { getTransactionsWithTimestamp } = require('./generatePersonTransaction');

const fromBlock = getConfig('blockchain.start_block');
const launchTime = getConfig('blockchain.launch_timestamp', false) || 0;
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

async function getDepositHistories(account, toBlock) {
    const logs = await getEvents(
        EVENT_TYPE.deposit,
        fromBlock,
        toBlock,
        account
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get deposit logs of ${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });
    const result = { groVault: [], powerD: [] };
    if (!logs.length) return result;
    logs.forEach((log) => {
        log.amount = new BN(log.args[3].toString());
        if (log.args[2]) {
            result.powerD.push(log);
        } else {
            result.groVault.push(log);
        }
    });
    return result;
}

async function getWithdrawHistories(account, toBlock) {
    const logs = await getEvents(
        EVENT_TYPE.withdraw,
        fromBlock,
        toBlock,
        account
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get withdraw filter for account:${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });
    const result = { groVault: [], powerD: [] };
    if (!logs.length) return result;
    logs.forEach((log) => {
        log.amount = new BN(log.args[6].toString());
        if (log.args[2]) {
            result.powerD.push(log);
        } else {
            result.groVault.push(log);
        }
    });
    return result;
}

async function getTransferHistories(account, filters, toBlock) {
    const logs1 = await getTransferEvents(
        filters[0],
        fromBlock,
        toBlock,
        account
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get ${filters[0]} logs of ${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });

    const logs2 = await getTransferEvents(
        filters[1],
        fromBlock,
        toBlock,
        account
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get ${filters[1]} logs of ${account} failed.`,
            MESSAGE_TYPES.miniStatsPersonal
        );
    });
    return {
        deposit: logs1,
        withdraw: logs2,
    };
}

async function getGroVaultTransferHistories(account, toBlock) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inGvtTransfer, EVENT_TYPE.outGvtTransfer],
        toBlock
    );
    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIMAL)
            .div(new BN(log.args[3].toString()));
    });
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIMAL)
            .div(new BN(log.args[3].toString()));
    });
    return logs;
}

async function getPowerDTransferHistories(account, toBlock) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inPwrdTransfer, EVENT_TYPE.outPwrdTransfer],
        toBlock
    );
    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString());
    });
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString());
    });
    return logs;
}

async function getTransactionHistories(account, toBlock) {
    const promises = [];
    promises.push(getGroVaultTransferHistories(account, toBlock));
    promises.push(getPowerDTransferHistories(account, toBlock));
    promises.push(getDepositHistories(account, toBlock));
    promises.push(getWithdrawHistories(account, toBlock));
    const result = await Promise.all(promises);
    const powerD = result[1];
    const depositLogs = result[2];
    const groVault = result[0];
    const withdrawLogs = result[3];
    groVault.deposit.push(...depositLogs.groVault);
    powerD.deposit.push(...depositLogs.powerD);

    groVault.withdraw.push(...withdrawLogs.groVault);
    powerD.withdraw.push(...withdrawLogs.powerD);
    return { groVault, powerD };
}

async function generateReport(account) {
    const latestBlock = await getDefaultProvider().getBlock();
    const promises = [];
    promises.push(getTransactionHistories(account, latestBlock.number));
    promises.push(getPowerD().getAssets(account));
    promises.push(getGroVault().getAssets(account));
    const results = await Promise.all(promises);
    const data = results[0];
    const pwrdBalance = new BN(results[1].toString());
    const gvtBalance = new BN(results[2].toString());

    logger.info(`${account} historical: ${JSON.stringify(data)}`);
    const transactions = await getTransactionsWithTimestamp(data);

    const result = {
        transactions,
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
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.amount_added.gvt = div(
        groVaultDepositAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.amount_added.total = div(
        depositAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );

    // amount_removed
    const withdrawAmount = powerDWithdrawAmount.plus(groVaultWithdrawAmount);
    result.amount_removed.pwrd = div(
        powerDWithdrawAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.amount_removed.gvt = div(
        groVaultWithdrawAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.amount_removed.total = div(
        withdrawAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );

    // net_amount_added
    const netPwrdAmount = powerDDepositAmount.minus(powerDWithdrawAmount);
    const netGvtAmount = groVaultDepositAmount.minus(groVaultWithdrawAmount);
    const netTotal = depositAmount.minus(withdrawAmount);
    result.net_amount_added.pwrd = div(
        netPwrdAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.net_amount_added.gvt = div(
        netGvtAmount,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.net_amount_added.total = div(
        netTotal,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );

    // current_balance
    const totalBalance = pwrdBalance.plus(gvtBalance);
    result.current_balance.pwrd = div(
        pwrdBalance,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.current_balance.gvt = div(
        gvtBalance,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.current_balance.total = div(
        totalBalance,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );

    // net_returns
    const pwrdReturn = pwrdBalance.minus(netPwrdAmount);
    const gvtReturn = gvtBalance.minus(netGvtAmount);
    const totalReturn = pwrdReturn.plus(gvtReturn);
    result.net_returns.pwrd = div(
        pwrdReturn,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.net_returns.gvt = div(
        gvtReturn,
        CONTRACT_ASSET_DECIMAL,
        amountDecimal
    );
    result.net_returns.total = div(
        totalReturn,
        CONTRACT_ASSET_DECIMAL,
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

    return {
        gro_personal_position: result,
    };
}

module.exports = {
    generateReport,
};
