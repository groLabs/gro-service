const BN = require('bignumber.js');
const { ethers } = require('ethers');
const logger = require('../statsLogger');
const { getFilterEvents } = require('../../common/logFilter-new');
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
const { AppendGTokenMintOrBurnAmountToLog } = require('../common/tool');
const {
    getAccountFailTransactions,
} = require('../handler/failedTransactionHandler-new');

const { ContractNames } = require('../../registry/registry');
const { newContract } = require('../../registry/contracts');

const {
    getContractsHistory,
    getLatestContractsAddress,
} = require('../../registry/registryLoader');
const erc20ABI = require('../../abi/ERC20.json');

const fromBlock = getConfig('blockchain.start_block');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);

let groVaultContracts;
let powerDContracts;
let depositHandlerContracts;
let withdrawHandlerContracts;
let latestDepositHandler;
let latestGroVault;
let latestPowerD;
let latestBuoy;
const stabeCoins = [];
const stabeCoinsInfo = {};

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

function getContracts(contractName) {
    const contracts = {};
    const contractHistory = getContractsHistory()[contractName];
    for (let i = 0; i < contractHistory.length; i += 1) {
        const contractInfo = contractHistory[i];
        const contract = newContract(contractName, contractInfo, provider);
        contracts[contractInfo.address] = contract;
    }
    return contracts;
}

async function getStabeCoins() {
    if (!stabeCoins.length) {
        const latestAddresses = getLatestContractsAddress();
        const contractInfo = latestAddresses[ContractNames.controller];
        const latestController = newContract(
            ContractNames.controller,
            contractInfo,
            provider
        );
        const stabeCoinAddresses = await latestController
            .stablecoins()
            .catch((error) => {
                logger.error(error);
                return [];
            });
        for (let i = 0; i < stabeCoinAddresses.length; i += 1) {
            stabeCoins.push(
                new ethers.Contract(stabeCoinAddresses[i], erc20ABI, provider)
            );
        }
    }
    return stabeCoins;
}

async function getStabeCoinsInfo() {
    const keys = Object.keys(stabeCoinsInfo);
    if (!keys.length) {
        stabeCoinsInfo.decimals = {};
        stabeCoinsInfo.symbols = {};
        const coins = await getStabeCoins();
        const decimalPromise = [];
        const symbolPromise = [];
        for (let i = 0; i < coins.length; i += 1) {
            decimalPromise.push(coins[i].decimals());
            symbolPromise.push(coins[i].symbol());
        }
        const decimals = await Promise.all(decimalPromise);
        const symbols = await Promise.all(symbolPromise);

        for (let i = 0; i < coins.length; i += 1) {
            stabeCoinsInfo.decimals[coins[i]] = decimals[i].toString();
            stabeCoinsInfo.symbols[coins[i]] = symbols[i];
        }
    }
    return stabeCoinsInfo;
}

function getDepositHandlerContracts() {
    if (!depositHandlerContracts) {
        depositHandlerContracts = getContracts(ContractNames.depositHandler);
    }
    return depositHandlerContracts;
}

function getWithdrawHandlerContracts() {
    if (!withdrawHandlerContracts) {
        withdrawHandlerContracts = getContracts(ContractNames.withdrawHandler);
    }
    return withdrawHandlerContracts;
}

function getGroVaultContracts() {
    if (!groVaultContracts) {
        groVaultContracts = getContracts(ContractNames.groVault);
    }
    return groVaultContracts;
}

function getPowerDContracts() {
    if (!powerDContracts) {
        powerDContracts = getContracts(ContractNames.powerD);
    }
    return powerDContracts;
}

function getLatestContract(contractName) {
    logger.info(`contractName: ${contractName}`);
    const latestAddresses = getLatestContractsAddress();
    const contractInfo = latestAddresses[contractName];
    logger.info(`contractInfo: ${contractInfo}`);
    const contractAddress = contractInfo.address;
    logger.info(`contractAddress: ${contractAddress}`);
    let contractHistory = [];
    switch (contractName) {
        case ContractNames.depositHandler:
            contractHistory = getDepositHandlerContracts();
            break;
        case ContractNames.groVault:
            contractHistory = getGroVaultContracts();
            break;
        case ContractNames.powerD:
            contractHistory = getPowerDContracts();
            break;
        default:
            logger.warn(`Not found history for ${contractName}`);
    }
    return contractHistory[contractAddress];
}

function getLatestDepositHandler() {
    if (!latestDepositHandler) {
        latestDepositHandler = getLatestContract(ContractNames.depositHandler);
    }
    return latestDepositHandler;
}

function getLatestGroVault() {
    if (!latestGroVault) {
        latestGroVault = getLatestContract(ContractNames.groVault);
    }
    logger.info(`latestPowerD: ${latestPowerD}`);
    return latestGroVault;
}

function getLatestPowerD() {
    if (!latestPowerD) {
        logger.info('init latestPowerD');
        latestPowerD = getLatestContract(ContractNames.powerD);
    }
    logger.info(`latestPowerD: ${latestPowerD}`);
    return latestPowerD;
}

function getLatestBuoy() {
    if (!latestBuoy) {
        const latestBuoyInfo =
            getLatestContractsAddress()[ContractNames.buoy3Pool];
        latestBuoy = newContract(
            ContractNames.buoy3Pool,
            latestBuoyInfo,
            provider
        );
    }
    return latestBuoy;
}

async function getHandlerEvents(account, contractName, eventName) {
    const contractHistory = getContractsHistory()[contractName];
    let handlers;
    switch (contractName) {
        case ContractNames.depositHandler:
            handlers = getDepositHandlerContracts();
            break;
        case ContractNames.withdrawHandler:
            handlers = getWithdrawHandlerContracts();
            break;
        default:
            logger.info(`Can't find handler for ${contractName}`);
    }
    const eventFilters = [];
    const contractInterfaces = [];
    for (let i = 0; i < contractHistory.length; i += 1) {
        const contractInfo = contractHistory[i];
        const { startBlock, address } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : 'latest';
        const contract = handlers[address];
        const filter = contract.filters[eventName](account);
        filter.fromBlock = startBlock;
        filter.toBlock = endBlock;
        eventFilters.push(filter);
        contractInterfaces.push(contract.interface);
    }

    const eventPromise = [];
    for (let i = 0; i < eventFilters.length; i += 1) {
        eventPromise.push(
            getFilterEvents(eventFilters[i], contractInterfaces[i], providerKey)
        );
    }
    const logs = await Promise.all(eventPromise);

    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        resultLogs.push(...logs[i]);
    }

    return resultLogs;
}

async function getDepositHistories(account) {
    const logs = await getHandlerEvents(
        account,
        ContractNames.depositHandler,
        'LogNewDeposit'
    ).catch((error) => {
        handleError(error, `Get deposit logs of ${account} failed.`, account);
    });

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

async function getWithdrawHistories(account) {
    const logs = await getHandlerEvents(
        account,
        ContractNames.withdrawHandler,
        'LogNewWithdrawal'
    ).catch((error) => {
        handleError(
            error,
            `Get withdraw filter for account:${account} failed.`,
            account
        );
    });
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

async function getTransferHistories(
    inGvtTransfers,
    outGvtTransfers,
    contractInterfaces
) {
    const inLogPromise = [];
    const outLogPromise = [];
    for (let i = 0; i < inGvtTransfers.length; i += 1) {
        inLogPromise.push(
            getFilterEvents(
                inGvtTransfers[i],
                contractInterfaces[i],
                providerKey
            )
        );
        outLogPromise.push(
            getFilterEvents(
                outGvtTransfers[i],
                contractInterfaces[i],
                providerKey
            )
        );
    }
    const inLogs = await Promise.all(inLogPromise);
    const outLogs = await Promise.all(outLogPromise);
    const depositLogs = [];
    const withdrawLogs = [];
    for (let i = 0; i < inLogs.length; i += 1) {
        depositLogs.push(...inLogs[i]);
        withdrawLogs.push(...outLogs[i]);
    }
    return {
        deposit: depositLogs,
        withdraw: withdrawLogs,
    };
}

async function getGTokenTransferEvents(account, isPWRD) {
    const contractName = isPWRD ? ContractNames.powerD : ContractNames.groVault;
    const tokenHistory = getContractsHistory()[contractName];
    const gtokens = isPWRD ? getPowerDContracts() : getGroVaultContracts();
    const inTransfers = [];
    const outTransfers = [];
    const contractInterfaces = [];
    for (let i = 0; i < tokenHistory.length; i += 1) {
        const contractInfo = tokenHistory[i];
        const { startBlock, address } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : 'latest';
        const contract = gtokens[address];
        const inFilter = contract.filters.LogTransfer(null, account);
        inFilter.fromBlock = startBlock;
        inFilter.toBlock = endBlock;
        const outFilter = contract.filters.LogTransfer(account);
        outFilter.fromBlock = startBlock;
        outFilter.toBlock = endBlock;
        inTransfers.push(inFilter);
        outTransfers.push(outFilter);
        contractInterfaces.push(contract.interface);
    }

    const logs = await getTransferHistories(
        inTransfers,
        outTransfers,
        contractInterfaces
    ).catch((error) => {
        logger.error(error);
        handleError(error, `Get transfer logs of ${account} failed.`, account);
    });

    return logs;
}

async function getGroVaultTransferHistories(account) {
    const logs = await getGTokenTransferEvents(account, false);

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

async function getPowerDTransferHistories(account) {
    const logs = await getGTokenTransferEvents(account, true);

    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString());
        log.coin_amount = log.args[2].toString();
    });
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString());
        log.coin_amount = log.args[2].toString();
    });
    return logs;
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

async function getGTokenUSDAmount(tokenAddress, share) {
    const groVault = getLatestGroVault();
    const powerD = getLatestPowerD();
    let usdAmount = 0;
    if (groVault.address === tokenAddress) {
        usdAmount = await groVault.getShareAssets(share).catch((error) => {
            logger.error(error);
            return 0;
        });
    } else {
        usdAmount = await powerD.getShareAssets(share).catch((error) => {
            logger.error(error);
            return 0;
        });
    }
    return usdAmount;
}

async function getApproveEventFilters(account) {
    const filters = [];
    const contractInterfaces = [];
    const depositHandlerAddress = getLatestDepositHandler().address;
    const depositContractInfo =
        getLatestContractsAddress()[ContractNames.depositHandler];
    // stabe coin approve filter
    const coins = await getStabeCoins();
    for (let i = 0; i < coins.length; i += 1) {
        const coin = coins[i];
        const filter = coin.filters.Approval(account, depositHandlerAddress);
        filter.fromBlock = depositContractInfo.startBlock;
        filter.toBlock = 'latest';
        filters.push(filter);
        contractInterfaces.push(coin.interface);
    }

    // gtoken approve filter
    const groVault = getLatestGroVault();
    const groVaultContractInfo =
        getLatestContractsAddress()[ContractNames.groVault];
    const groVaultApprovalFilter = groVault.filters.Approval(account, null);
    groVaultApprovalFilter.fromBlock = groVaultContractInfo.startBlock;
    groVaultContractInfo.toBlock = 'latest';
    filters.push(groVaultApprovalFilter);
    contractInterfaces.push(groVault.interface);

    const pwrd = getLatestPowerD();
    const pwrdContractInfo = getLatestContractsAddress()[ContractNames.powerD];
    const pwrdApprovalFilter = pwrd.filters.Approval(account, null);
    pwrdApprovalFilter.fromBlock = pwrdContractInfo.startBlock;
    pwrdApprovalFilter.toBlock = 'latest';
    filters.push(pwrdApprovalFilter);
    contractInterfaces.push(pwrd.interface);

    return { filters, contractInterfaces };
}

async function getApprovalEvents(account) {
    const { filters: eventFilters, contractInterfaces } =
        await getApproveEventFilters(account);

    const eventPromise = [];
    for (let i = 0; i < eventFilters.length; i += 1) {
        eventPromise.push(
            getFilterEvents(eventFilters[i], contractInterfaces[i], providerKey)
        );
    }
    const logs = await Promise.all(eventPromise);

    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        resultLogs.push(...logs[i]);
    }

    return resultLogs;
}

async function getApprovalHistoryies(account, depositEventHashs) {
    const approvalEventResult = await getApprovalEvents(account).catch(
        (error) => {
            handleError(
                error,
                `Get approval filter for account:${account} failed.`,
                account
            );
        }
    );

    const stableCoinInfo = getStabeCoinsInfo();
    const result = [];
    const usdAmoutPromise = [];
    const buoy = getLatestBuoy();
    for (let i = 0; i < approvalEventResult.length; i += 1) {
        const { address, transactionHash, blockNumber, args } =
            approvalEventResult[i];
        const decimal = stableCoinInfo.decimals[address];
        if (!depositEventHashs.includes(transactionHash)) {
            const tokenSymbio = stableCoinInfo.symbols[address];
            result.push({
                transaction: 'approval',
                token: tokenSymbio,
                hash: transactionHash,
                spender: args[1],
                coin_amount: div(args[2], BN(10).pow(decimal), 2),
                block_number: blockNumber,
            });
            if (isGToken(tokenSymbio)) {
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
    return result;
}

async function getTransactionHistories(account) {
    const promises = [];
    promises.push(getGroVaultTransferHistories(account));
    promises.push(getPowerDTransferHistories(account));
    promises.push(getDepositHistories(account));
    promises.push(getWithdrawHistories(account));
    const result = await Promise.all(promises);
    const powerD = result[1];
    const depositLogs = result[2];
    const groVault = result[0];
    const withdrawLogs = result[3];
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

    const approval = await getApprovalHistoryies(account, depositEventHashs);
    return { groVault, powerD, approval };
}

async function generateReport(account) {
    const latestBlock = await provider.getBlock();
    const promises = [];
    promises.push(getTransactionHistories(account));
    promises.push(getLatestPowerD().getAssets(account));
    promises.push(getLatestGroVault().getAssets(account));
    const results = await Promise.all(promises);
    const data = results[0];
    const pwrdBalance = new BN(results[1].toString());
    const gvtBalance = new BN(results[2].toString());

    logger.info(`${account} historical: ${JSON.stringify(data)}`);
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
        transactions,
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
