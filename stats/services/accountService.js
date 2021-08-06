const BN = require('bignumber.js');
const logger = require('../statsLogger');
const {
    getGvt: getGroVault,
    getPwrd: getPowerD,
    getDepositHandler,
    getWithdrawHandler,
    getBuoy,
} = require('../../contract/allContracts');
const {
    EVENT_TYPE,
    getTransferEvents,
    getApprovalEvents,
    getDepositWithdrawEvents,
} = require('../../common/logFilter');
const {
    getAlchemyRpcProvider,
    getTimestampByBlockNumber,
} = require('../../common/chainUtil');
const { ContractCallError, ParameterError } = require('../../common/error');
const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const {
    getTransactions,
    getTransaction,
} = require('./generatePersonTransaction');
const { shortAccount } = require('../../common/digitalUtil');
const { getVaultStabeCoins } = require('../../contract/allContracts');
const { AppendGTokenMintOrBurnAmountToLog } = require('../common/tool');
const {
    getAccountFailTransactions,
} = require('../handler/failedTransactionHandler');

const fromBlock = getConfig('blockchain.start_block');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;
const depositHandlerHistoryConfig =
    getConfig('deposit_handler_history', false) || {};
const withdrawHandlerHistoryConfig =
    getConfig('withdraw_handler_history', false) || {};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const depositHandlerHistory = Object.keys(depositHandlerHistoryConfig);
const withdrawHandlerHistory = Object.keys(withdrawHandlerHistoryConfig);

const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);

const accountDepositHandlerHistories = {};
const accountWithdrawHandlerHistories = {};

function getFailedEmbedMessage(account) {
    const label = shortAccount(account);
    return {
        type: MESSAGE_TYPES.miniStatsPersonal,
        description: `${label} get his personal stats failed`,
        urls: [
            {
                label,
                type: 'account',
                value: account,
            },
        ],
    };
}

function handleError(error, message, account) {
    logger.error(error);
    throw new ContractCallError(message, MESSAGE_TYPES.miniStatsPersonal, {
        embedMessage: getFailedEmbedMessage(account),
    });
}

async function getDepositHistories(account, toBlock) {
    let needWrited = false;
    let handlerHistories;
    // query history
    const accountDepositHandlers = accountDepositHandlerHistories[account];
    if (accountDepositHandlers) {
        handlerHistories = accountDepositHandlers;
    } else {
        handlerHistories = depositHandlerHistory;
        needWrited = true;
    }

    const logs = await getDepositWithdrawEvents(
        EVENT_TYPE.deposit,
        fromBlock,
        toBlock,
        account,
        providerKey,
        handlerHistories
    ).catch((error) => {
        handleError(error, `Get deposit logs of ${account} failed.`, account);
    });

    // write data to history memory
    if (needWrited) {
        const handlers = new Set();
        logs.forEach((log) => handlers.add(log.address));
        handlers.add(getDepositHandler().address);
        accountDepositHandlerHistories[account] = Array.from(handlers);
    }
    // handle gtoken mint amount
    await AppendGTokenMintOrBurnAmountToLog(logs);

    const result = { groVault: [], powerD: [] };
    if (!logs.length) return result;
    logs.forEach((log) => {
        log.amount = new BN(log.args[3].toString());
        log.coin_amount = log.gtokenAmount;
        if (log.args[2]) {
            result.powerD.push(log);
        } else {
            result.groVault.push(log);
        }
    });
    return result;
}

async function getWithdrawHistories(account, toBlock) {
    let needWrited = false;
    let handlerHistories;
    const accountHandlerHistories = accountWithdrawHandlerHistories[account];
    if (accountHandlerHistories) {
        handlerHistories = accountHandlerHistories;
    } else {
        handlerHistories = withdrawHandlerHistory;
        needWrited = true;
    }

    const logs = await getDepositWithdrawEvents(
        EVENT_TYPE.withdraw,
        fromBlock,
        toBlock,
        account,
        providerKey,
        handlerHistories
    ).catch((error) => {
        handleError(
            error,
            `Get withdraw filter for account:${account} failed.`,
            account
        );
    });

    // write data to history memory
    if (needWrited) {
        const handlers = new Set();
        logs.forEach((log) => handlers.add(log.address));
        handlers.add(getWithdrawHandler().address);
        accountWithdrawHandlerHistories[account] = Array.from(handlers);
    }

    // handle gtoken burn amount
    await AppendGTokenMintOrBurnAmountToLog(logs);

    const result = { groVault: [], powerD: [] };
    if (!logs.length) return result;
    logs.forEach((log) => {
        log.amount = new BN(log.args[6].toString());
        log.coin_amount = log.gtokenAmount;
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
        account,
        providerKey
    ).catch((error) => {
        handleError(
            error,
            `Get ${filters[0]} logs of ${account} failed.`,
            account
        );
    });

    const logs2 = await getTransferEvents(
        filters[1],
        fromBlock,
        toBlock,
        account,
        providerKey
    ).catch((error) => {
        handleError(
            error,
            `Get ${filters[1]} logs of ${account} failed.`,
            account
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
        log.coin_amount = log.args[2].toString();
    });
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIMAL)
            .div(new BN(log.args[3].toString()));
        log.coin_amount = log.args[2].toString();
    });

    return logs;
}

async function getGroVaultTransferFromHistories(account, toBlock) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inGvtTransferFrom, EVENT_TYPE.outGvtTransferFrom],
        toBlock
    );
    return logs;
}

async function getPowerDTransferHistories(account, toBlock) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inPwrdTransfer, EVENT_TYPE.outPwrdTransfer],
        toBlock
    );
    const transferIn = [];
    const transferOut = [];
    const { deposit, withdraw } = logs;
    deposit.forEach((log) => {
        if (log.args[0] === ZERO_ADDRESS) return;
        log.amount = new BN(log.args[2].toString());
        log.coin_amount = log.args[2].toString();
        transferIn.push(log);
    });
    withdraw.forEach((log) => {
        if (log.args[1] === ZERO_ADDRESS) return;
        log.amount = new BN(log.args[2].toString());
        log.coin_amount = log.args[2].toString();
        transferOut.push(log);
    });
    return { deposit: transferIn, withdraw: transferOut };
}

function getStableCoinIndex(tokenSymbio) {
    switch (tokenSymbio) {
        case 'DAI':
            return 0;
        case 'USDC':
            return 1;
        case 'USDT':
            return 2;
        default:
            throw new ParameterError(`Not found token symbo: ${tokenSymbio}`);
    }
}

function isGToken(tokenSymbio) {
    if (['DAI', 'USDC', 'USDT'].includes(tokenSymbio)) return false;
    return true;
}

async function getGTokenUSDAmount(tokenAddress, share, providerKey) {
    const groVault = getGroVault(providerKey);
    let usdAmount = 0;
    if (groVault.address === tokenAddress) {
        usdAmount = await groVault.getShareAssets(share).catch((error) => {
            logger.error(error);
            return share;
        });
    } else {
        usdAmount = share;
    }
    return usdAmount;
}

async function getApprovalHistoryies(account, toBlock, depositEventHashs) {
    const approvalEventResult = await getApprovalEvents(
        account,
        fromBlock,
        toBlock,
        providerKey
    ).catch((error) => {
        handleError(
            error,
            `Get approval filter for account:${account} failed.`,
            account
        );
    });

    const stableCoinInfo = getVaultStabeCoins(providerKey);
    const result = [];
    const gtokenAproval = [];
    const usdAmoutPromise = [];
    const buoy = getBuoy(providerKey);
    for (let i = 0; i < approvalEventResult.length; i += 1) {
        const { address, transactionHash, blockNumber, args } =
            approvalEventResult[i];
        const decimal = stableCoinInfo.decimals[address];
        const tokenSymbio = stableCoinInfo.symbols[address];
        const isGTokenFlag = isGToken(tokenSymbio);
        if (isGTokenFlag) {
            gtokenAproval.push(transactionHash);
        }

        if (!depositEventHashs.includes(transactionHash)) {
            result.push({
                transaction: 'approval',
                token: tokenSymbio,
                hash: transactionHash,
                spender: args[1],
                coin_amount: div(args[2], BN(10).pow(decimal), 2),
                block_number: blockNumber,
            });
            if (isGTokenFlag) {
                usdAmoutPromise.push(
                    getGTokenUSDAmount(address, args[2], providerKey)
                );
            } else {
                usdAmoutPromise.push(
                    buoy.singleStableToUsd(
                        args[2],
                        getStableCoinIndex(tokenSymbio)
                    )
                );
            }
        }
    }

    const usdAmoutResult = await Promise.all(usdAmoutPromise).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get approval usd amount for ${account} failed.`
        );
    });
    for (let i = 0; i < result.length; i += 1) {
        result[i].usd_amount = div(usdAmoutResult[i], BN(10).pow(18), 2);
    }
    return { approvalEvents: result, gtokenApprovalTxn: gtokenAproval };
}

async function parseVaultTransferFromLogs(logs, gtokenApprovaltxns) {
    const transferIn = [];
    const transferOut = [];
    const { deposit, withdraw } = logs;
    const groVaultFactors = {};
    deposit.forEach((log) => {
        // skip mint gtoken
        if (log.args[0] === ZERO_ADDRESS) return;
        if (gtokenApprovaltxns.includes(log.transactionHash)) {
            transferIn.push(log);
            groVaultFactors[`${log.blockNumber}`] = 0;
        }
    });

    withdraw.forEach((log) => {
        // skip burn gtoken
        if (log.args[1] === ZERO_ADDRESS) return;
        if (gtokenApprovaltxns.includes(log.transactionHash)) {
            transferOut.push(log);
            groVaultFactors[`${log.blockNumber}`] = 0;
        }
    });

    // handle vault's refactor
    const blockNumbers = Object.keys(groVaultFactors);
    const factorPromises = [];
    for (let i = 0; i < blockNumbers.length; i += 1) {
        factorPromises.push(
            getGroVault(providerKey).factor({
                blockTag: parseInt(blockNumbers[i], 10),
            })
        );
    }
    const factorPromiseResult = await Promise.all(factorPromises);
    for (let i = 0; i < blockNumbers.length; i += 1) {
        const blockNumber = blockNumbers[i];
        groVaultFactors[blockNumber] = factorPromiseResult[i];
    }

    transferIn.forEach((log) => {
        const factor = groVaultFactors[`${log.blockNumber}`];
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIMAL)
            .div(BN(factor.toString()));
        log.coin_amount = log.args[2].toString();
    });
    transferOut.forEach((log) => {
        const factor = groVaultFactors[`${log.blockNumber}`];
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(CONTRACT_ASSET_DECIMAL)
            .div(BN(factor.toString()));
        log.coin_amount = log.args[2].toString();
    });

    return {
        deposit: transferIn,
        withdraw: transferOut,
    };
}

async function getTransactionHistories(account, toBlock) {
    const promises = [];
    promises.push(getGroVaultTransferHistories(account, toBlock));
    promises.push(getPowerDTransferHistories(account, toBlock));
    promises.push(getDepositHistories(account, toBlock));
    promises.push(getWithdrawHistories(account, toBlock));
    promises.push(getGroVaultTransferFromHistories(account, toBlock));
    const result = await Promise.all(promises);
    const powerD = result[1];
    const depositLogs = result[2];
    const groVault = result[0];
    const withdrawLogs = result[3];
    const groVaultTransferFromLogs = result[4];

    groVault.deposit.push(...depositLogs.groVault);
    powerD.deposit.push(...depositLogs.powerD);

    groVault.withdraw.push(...withdrawLogs.groVault);
    powerD.withdraw.push(...withdrawLogs.powerD);

    const { groVault: vaultDepositLogs, powerD: pwrdDepositLogs } = depositLogs;
    const depositEventHashs = [];
    for (let i = 0; i < vaultDepositLogs.length; i += 1) {
        depositEventHashs.push(vaultDepositLogs[i].transactionHash);
    }
    for (let i = 0; i < pwrdDepositLogs.length; i += 1) {
        depositEventHashs.push(pwrdDepositLogs[i].transactionHash);
    }

    const approval = await getApprovalHistoryies(
        account,
        toBlock,
        depositEventHashs
    );

    const gtokenApprovalTxns = approval.gtokenApprovalTxn;
    const transferFromEvents = await parseVaultTransferFromLogs(
        groVaultTransferFromLogs,
        gtokenApprovalTxns
    );

    groVault.deposit.push(...transferFromEvents.deposit);
    groVault.withdraw.push(...transferFromEvents.withdraw);

    return { groVault, powerD, approval: approval.approvalEvents };
}

async function generateReport(account) {
    const latestBlock = await provider.getBlock();
    const promises = [];
    account = account.toLowerCase();
    promises.push(getTransactionHistories(account, latestBlock.number));
    promises.push(getPowerD(providerKey).getAssets(account));
    promises.push(getGroVault(providerKey).getAssets(account));
    const results = await Promise.all(promises);
    const data = results[0];
    const pwrdBalance = new BN(results[1].toString());
    const gvtBalance = new BN(results[2].toString());

    // logger.info(`${account} historical: ${JSON.stringify(data)}`);
    const { groVault, powerD, approval } = data;
    const failTransactions = await getAccountFailTransactions(account);
    const transactions = await getTransactions(groVault, powerD, provider);
    const transaction = await getTransaction(
        transactions,
        approval,
        failTransactions,
        provider
    );
    const launchTime = await getTimestampByBlockNumber(fromBlock, provider);

    const result = {
        transaction,
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
