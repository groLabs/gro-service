const BN = require('bignumber.js');
const { ethers, BigNumber } = require('ethers');
const logger = require('../statsLogger');
const { getFilterEvents } = require('../../dist/common/logFilter-new');
const { getAlchemyRpcProvider, getTimestampByBlockNumber, } = require('../../dist/common/chainUtil');
const { ContractCallError, ParameterError, } = require('../../dist/common/error');
const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const { MESSAGE_TYPES } = require('../../dist/common/discord/discordService');
const { getConfig } = require('../../dist/common/configUtil');
const { getTransactions, getTransaction, } = require('./generatePersonTransaction');
const { shortAccount } = require('../../common/digitalUtil');
const { AppendGTokenMintOrBurnAmountToLog } = require('../common/tool');
const { getAccountFailTransactions, } = require('../handler/failedTransactionHandler');
const { ContractNames } = require('../../dist/registry/registry');
const { newContract } = require('../../dist/registry/contracts');
const { getContractsHistory, getLatestContractsAddress, } = require('../../dist/registry/registryLoader');
const { getLatestSystemContract } = require('../common/contractStorage');
const { getAllAirdropResults } = require('./airdropService');
// const { getPoolTransactions } = require('./lpoolService');
const erc20ABI = require('../../abi/ERC20.json');
const fromBlock = getConfig('blockchain.start_block');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);
const accountDepositHandlerHistories = {};
const accountWithdrawHandlerHistories = {};
let groVaultContracts;
let powerDContracts;
let depositHandlerContracts;
let withdrawHandlerContracts;
const stableCoins = [];
const stableCoinsInfo = {};
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
        const contract = newContract(contractName, contractInfo, {
            providerKey,
        });
        contracts[contractInfo.address] = contract.contract;
    }
    return contracts;
}
async function getNetwork() {
    return provider.getNetwork();
}
async function getStableCoins() {
    if (!stableCoins.length) {
        const latestController = getLatestSystemContract(ContractNames.controller, providerKey).contract;
        const stableCoinAddresses = await latestController
            .stablecoins()
            .catch((error) => {
            logger.error(error);
            return [];
        });
        for (let i = 0; i < stableCoinAddresses.length; i += 1) {
            stableCoins.push(new ethers.Contract(stableCoinAddresses[i], erc20ABI, provider));
        }
    }
    return stableCoins;
}
function getDepositHandlerContracts(handlerHistories) {
    if (!depositHandlerContracts) {
        depositHandlerContracts = getContracts(ContractNames.depositHandler);
    }
    let depositHandlers = {};
    if (handlerHistories) {
        for (let i = 0; i < handlerHistories.length; i += 1) {
            depositHandlers[handlerHistories[i]] =
                depositHandlerContracts[handlerHistories[i]];
        }
    }
    else {
        depositHandlers = depositHandlerContracts;
    }
    return depositHandlers;
}
function getWithdrawHandlerContracts(handlerHistories) {
    if (!withdrawHandlerContracts) {
        withdrawHandlerContracts = getContracts(ContractNames.withdrawHandler);
    }
    let withdrawHandlers = {};
    if (handlerHistories) {
        for (let i = 0; i < handlerHistories.length; i += 1) {
            withdrawHandlers[handlerHistories[i]] =
                withdrawHandlerContracts[handlerHistories[i]];
        }
    }
    else {
        withdrawHandlers = withdrawHandlerContracts;
    }
    return withdrawHandlers;
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
function getLatestDepositHandler() {
    return getLatestSystemContract(ContractNames.depositHandler, providerKey)
        .contract;
}
function getLatestWithdrawHandler() {
    return getLatestSystemContract(ContractNames.withdrawHandler, providerKey)
        .contract;
}
function getLatestGroVault() {
    return getLatestSystemContract(ContractNames.groVault, providerKey)
        .contract;
}
function getLatestPowerD() {
    return getLatestSystemContract(ContractNames.powerD, providerKey).contract;
}
function getContractInfosByAddresses(contractName, handlerHistories) {
    const contractHistory = getContractsHistory()[contractName];
    const contractInfos = [];
    if (handlerHistories) {
        for (let i = 0; i < contractHistory.length; i += 1) {
            const contractInfo = contractHistory[i];
            if (handlerHistories.includes(contractInfo.address)) {
                contractInfos.push(contractInfo);
            }
        }
    }
    else {
        contractInfos.push(...contractHistory);
    }
    return contractInfos;
}
async function getStableCoinsInfo() {
    const keys = Object.keys(stableCoinsInfo);
    if (!keys.length) {
        stableCoinsInfo.decimals = {};
        stableCoinsInfo.symbols = {};
        const coins = await getStableCoins();
        coins.push(getLatestGroVault());
        coins.push(getLatestPowerD());
        const decimalPromise = [];
        const symbolPromise = [];
        for (let i = 0; i < coins.length; i += 1) {
            decimalPromise.push(coins[i].decimals());
            symbolPromise.push(coins[i].symbol());
        }
        const decimals = await Promise.all(decimalPromise);
        const symbols = await Promise.all(symbolPromise);
        for (let i = 0; i < coins.length; i += 1) {
            stableCoinsInfo.decimals[coins[i].address] = decimals[i].toString();
            stableCoinsInfo.symbols[coins[i].address] = symbols[i];
        }
    }
    return stableCoinsInfo;
}
async function getHandlerEvents(account, contractName, eventName, handlerHistories) {
    const contractHistory = getContractInfosByAddresses(contractName, handlerHistories);
    let handlers;
    switch (contractName) {
        case ContractNames.depositHandler:
            handlers = getDepositHandlerContracts(handlerHistories);
            break;
        case ContractNames.withdrawHandler:
            handlers = getWithdrawHandlerContracts(handlerHistories);
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
        eventPromise.push(getFilterEvents(eventFilters[i], contractInterfaces[i], providerKey));
    }
    const logs = await Promise.all(eventPromise);
    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        resultLogs.push(...logs[i]);
    }
    return resultLogs;
}
async function getDepositHistories(account) {
    let needWrited = false;
    let handlerHistories;
    // query history
    const accountDepositHandlers = accountDepositHandlerHistories[account];
    if (accountDepositHandlers) {
        handlerHistories = accountDepositHandlers;
    }
    else {
        needWrited = true;
    }
    const logs = await getHandlerEvents(account, ContractNames.depositHandler, 'LogNewDeposit', handlerHistories).catch((error) => {
        handleError(error, `Get deposit logs of ${account} failed.`, account);
    });
    // write data to history memory
    if (needWrited) {
        const handlers = new Set();
        logs.forEach((log) => handlers.add(log.address));
        handlers.add(getLatestDepositHandler().address);
        accountDepositHandlerHistories[account] = Array.from(handlers);
    }
    // handle gtoken mint amount
    await AppendGTokenMintOrBurnAmountToLog(logs);
    const result = { groVault: [], powerD: [] };
    if (!logs.length)
        return result;
    logs.forEach((log) => {
        log.amount = new BN(log.args[3].toString());
        if (log.args[2]) {
            log.coin_amount = log.amount;
            result.powerD.push(log);
        }
        else {
            log.coin_amount = log.gtokenAmount;
            result.groVault.push(log);
        }
    });
    return result;
}
async function getWithdrawHistories(account) {
    let needWrited = false;
    let handlerHistories;
    const accountHandlerHistories = accountWithdrawHandlerHistories[account];
    if (accountHandlerHistories) {
        handlerHistories = accountHandlerHistories;
    }
    else {
        needWrited = true;
    }
    const logs = await getHandlerEvents(account, ContractNames.withdrawHandler, 'LogNewWithdrawal', handlerHistories).catch((error) => {
        handleError(error, `Get withdraw filter for account:${account} failed.`, account);
    });
    // write data to history memory
    if (needWrited) {
        const handlers = new Set();
        logs.forEach((log) => handlers.add(log.address));
        handlers.add(getLatestWithdrawHandler().address);
        accountWithdrawHandlerHistories[account] = Array.from(handlers);
    }
    // handle gtoken burn amount
    await AppendGTokenMintOrBurnAmountToLog(logs);
    const result = { groVault: [], powerD: [] };
    if (!logs.length)
        return result;
    logs.forEach((log) => {
        log.amount = new BN(log.args[6].toString());
        if (log.args[2]) {
            log.coin_amount = log.amount;
            result.powerD.push(log);
        }
        else {
            log.coin_amount = log.gtokenAmount;
            result.groVault.push(log);
        }
    });
    return result;
}
async function getTransferHistories(inGvtTransfers, outGvtTransfers, contractInterfaces) {
    const inLogPromise = [];
    const outLogPromise = [];
    for (let i = 0; i < inGvtTransfers.length; i += 1) {
        inLogPromise.push(getFilterEvents(inGvtTransfers[i], contractInterfaces[i], providerKey));
        outLogPromise.push(getFilterEvents(outGvtTransfers[i], contractInterfaces[i], providerKey));
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
async function getGTokenTransferEvents(account, isPWRD, groVaultOriginalTransfer) {
    const contractName = isPWRD ? ContractNames.powerD : ContractNames.groVault;
    const tokenHistory = getContractsHistory()[contractName];
    const gtokens = isPWRD ? getPowerDContracts() : getGroVaultContracts();
    const inTransfers = [];
    const outTransfers = [];
    const contractInterfaces = [];
    let logSign = isPWRD ? 'Transfer' : 'LogTransfer';
    if (!isPWRD && groVaultOriginalTransfer) {
        logSign = 'Transfer';
    }
    for (let i = 0; i < tokenHistory.length; i += 1) {
        const contractInfo = tokenHistory[i];
        const { startBlock, address } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : 'latest';
        const contract = gtokens[address];
        const inFilter = contract.filters[logSign](null, account);
        inFilter.fromBlock = startBlock;
        inFilter.toBlock = endBlock;
        const outFilter = contract.filters[logSign](account);
        outFilter.fromBlock = startBlock;
        outFilter.toBlock = endBlock;
        inTransfers.push(inFilter);
        outTransfers.push(outFilter);
        contractInterfaces.push(contract.interface);
    }
    const logs = await getTransferHistories(inTransfers, outTransfers, contractInterfaces).catch((error) => {
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
async function getGroVaultTransferFromHistories(account) {
    const logs = await getGTokenTransferEvents(account, false, true);
    return logs;
}
async function getPowerDTransferHistories(account) {
    const logs = await getGTokenTransferEvents(account, true);
    const transferIn = [];
    const transferOut = [];
    const { deposit, withdraw } = logs;
    deposit.forEach((log) => {
        if (log.args[0] === ZERO_ADDRESS)
            return;
        log.amount = new BN(log.args[2].toString());
        log.coin_amount = log.args[2].toString();
        transferIn.push(log);
    });
    withdraw.forEach((log) => {
        if (log.args[1] === ZERO_ADDRESS)
            return;
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
    if (['DAI', 'USDC', 'USDT'].includes(tokenSymbio))
        return false;
    return true;
}
async function getGTokenUSDAmount(tokenAddress, share) {
    const groVault = getLatestGroVault();
    let usdAmount = 0;
    if (groVault.address === tokenAddress) {
        usdAmount = await groVault.getShareAssets(share).catch((error) => {
            logger.error(error);
            return 0;
        });
    }
    else {
        usdAmount = share;
    }
    return usdAmount;
}
async function getApproveEventFilters(account) {
    const filters = [];
    const contractInterfaces = [];
    const depositHandlerAddress = getLatestDepositHandler().address;
    const depositContractInfo = getLatestContractsAddress()[ContractNames.depositHandler];
    // stable coin approve filter
    const coins = await getStableCoins();
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
    const groVaultContractInfo = getLatestContractsAddress()[ContractNames.groVault];
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
    const { filters: eventFilters, contractInterfaces } = await getApproveEventFilters(account);
    const eventPromise = [];
    for (let i = 0; i < eventFilters.length; i += 1) {
        eventPromise.push(getFilterEvents(eventFilters[i], contractInterfaces[i], providerKey));
    }
    const logs = await Promise.all(eventPromise);
    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        resultLogs.push(...logs[i]);
    }
    return resultLogs;
}
async function gvtApprovalToAccount(account, withdrawEventHashs) {
    const groVault = getLatestGroVault();
    const groVaultContractInfo = getLatestContractsAddress()[ContractNames.groVault];
    const groVaultApprovalFilter = groVault.filters.Approval(null, account);
    groVaultApprovalFilter.fromBlock = groVaultContractInfo.startBlock;
    groVaultContractInfo.toBlock = 'latest';
    const logs = await getFilterEvents(groVaultApprovalFilter, groVault.interface, providerKey);
    const distHash = [];
    logs.forEach((log) => {
        if (!withdrawEventHashs.includes(log.transactionHash)) {
            distHash.push(log.transactionHash);
        }
    });
    return distHash;
}
async function getApprovalHistoryies(account, depositEventHashs) {
    const approvalEventResult = await getApprovalEvents(account).catch((error) => {
        handleError(error, `Get approval filter for account:${account} failed.`, account);
    });
    const stableCoinInfo = await getStableCoinsInfo();
    const result = [];
    const gtokenAproval = [];
    const usdAmoutPromise = [];
    const buoy = getLatestSystemContract(ContractNames.buoy3Pool, providerKey).contract;
    for (let i = 0; i < approvalEventResult.length; i += 1) {
        const { address, transactionHash, blockNumber, args } = approvalEventResult[i];
        const decimal = stableCoinInfo.decimals[address];
        if (!depositEventHashs.includes(transactionHash)) {
            const tokenSymbio = stableCoinInfo.symbols[address];
            const isGTokenFlag = isGToken(tokenSymbio);
            if (isGTokenFlag) {
                gtokenAproval.push(transactionHash);
            }
            result.push({
                transaction: 'approval',
                token: tokenSymbio,
                hash: transactionHash,
                spender: args[1],
                coin_amount: div(args[2], BN(10).pow(decimal), 2),
                block_number: blockNumber,
            });
            if (isGTokenFlag) {
                usdAmoutPromise.push(getGTokenUSDAmount(address, args[2], providerKey));
            }
            else {
                console.log(` ----- ${address} ${transactionHash} ${blockNumber} ${args[2]}`);
                // const aaa = await buoy.singleStableToUsd(
                //     args[2],
                //     getStableCoinIndex(tokenSymbio)
                // );
                // console.log(' ----- done');
                // usdAmoutPromise.push(
                //     buoy.singleStableToUsd(
                //         args[2],
                //         getStableCoinIndex(tokenSymbio)
                //     )
                // );
                usdAmoutPromise.push(new Promise((resolve, reject) => {
                    resolve(BigNumber.from('1000000000000000000'));
                }));
            }
        }
    }
    const usdAmoutResult = await Promise.all(usdAmoutPromise).catch((error) => {
        logger.error(error);
        throw new ContractCallError(`Get approval usd amount for ${account} failed.`);
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
        if (log.args[0] === ZERO_ADDRESS)
            return;
        if (gtokenApprovaltxns.includes(log.transactionHash)) {
            transferIn.push(log);
            groVaultFactors[`${log.blockNumber}`] = 0;
        }
    });
    withdraw.forEach((log) => {
        // skip burn gtoken
        if (log.args[1] === ZERO_ADDRESS)
            return;
        if (gtokenApprovaltxns.includes(log.transactionHash)) {
            transferOut.push(log);
            groVaultFactors[`${log.blockNumber}`] = 0;
        }
    });
    // handle vault's refactor
    const blockNumbers = Object.keys(groVaultFactors);
    const factorPromises = [];
    for (let i = 0; i < blockNumbers.length; i += 1) {
        factorPromises.push(getLatestGroVault().factor({
            blockTag: parseInt(blockNumbers[i], 10),
        }));
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
async function getTransactionHistories(account) {
    const promises = [];
    promises.push(getGroVaultTransferHistories(account));
    promises.push(getPowerDTransferHistories(account));
    promises.push(getDepositHistories(account));
    promises.push(getWithdrawHistories(account));
    promises.push(getGroVaultTransferFromHistories(account));
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
    const { groVault: vaultWithdrawLogs, powerD: pwrdWithdrawLogs } = withdrawLogs;
    const withdrawEventHashs = [];
    for (let i = 0; i < vaultWithdrawLogs.length; i += 1) {
        withdrawEventHashs.push(vaultWithdrawLogs[i].transactionHash);
    }
    for (let i = 0; i < pwrdWithdrawLogs.length; i += 1) {
        withdrawEventHashs.push(pwrdWithdrawLogs[i].transactionHash);
    }
    const approval = await getApprovalHistoryies(account, depositEventHashs);
    const gvtApprovalToUs = await gvtApprovalToAccount(account, withdrawEventHashs);
    const gtokenApprovalTxns = approval.gtokenApprovalTxn;
    const transferFromEvents = await parseVaultTransferFromLogs(groVaultTransferFromLogs, [...gtokenApprovalTxns, ...gvtApprovalToUs]);
    groVault.deposit.push(...transferFromEvents.deposit);
    groVault.withdraw.push(...transferFromEvents.withdraw);
    return { groVault, powerD, approval: approval.approvalEvents };
}
async function ethereumPersonalStats(account) {
    const latestBlock = await provider.getBlock();
    const promises = [];
    account = account.toLowerCase();
    promises.push(getTransactionHistories(account));
    promises.push(getLatestPowerD().getAssets(account));
    promises.push(getLatestGroVault().getAssets(account));
    const results = await Promise.all(promises);
    const data = results[0];
    const pwrdBalance = new BN(results[1].toString());
    const gvtBalance = new BN(results[2].toString());
    // logger.info(`${account} historical: ${JSON.stringify(data)}`);
    const { groVault, powerD, approval } = data;
    const failTransactions = await getAccountFailTransactions(account);
    const transactions = await getTransactions(groVault, powerD, provider);
    const transaction = await getTransaction(transactions, approval, failTransactions, provider);
    const launchTime = await getTimestampByBlockNumber(fromBlock, provider);
    const airdrops = await getAllAirdropResults(account, latestBlock.number);
    // airdrops.push(await getFirstAirdropResult(account));
    // airdrops.push(await getSecondAirdropResult(account));
    // airdrops.push(await getThirdAirdropResult(account));
    // const pools = await getPoolTransactions(account, latestBlock.number);
    // transaction.pools = pools;
    const result = {
        airdrops,
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
    result.amount_added.pwrd = div(powerDDepositAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.amount_added.gvt = div(groVaultDepositAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.amount_added.total = div(depositAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    // amount_removed
    const withdrawAmount = powerDWithdrawAmount.plus(groVaultWithdrawAmount);
    result.amount_removed.pwrd = div(powerDWithdrawAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.amount_removed.gvt = div(groVaultWithdrawAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.amount_removed.total = div(withdrawAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    // net_amount_added
    const netPwrdAmount = powerDDepositAmount.minus(powerDWithdrawAmount);
    const netGvtAmount = groVaultDepositAmount.minus(groVaultWithdrawAmount);
    const netTotal = depositAmount.minus(withdrawAmount);
    result.net_amount_added.pwrd = div(netPwrdAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.net_amount_added.gvt = div(netGvtAmount, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.net_amount_added.total = div(netTotal, CONTRACT_ASSET_DECIMAL, amountDecimal);
    // current_balance
    const totalBalance = pwrdBalance.plus(gvtBalance);
    result.current_balance.pwrd = div(pwrdBalance, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.current_balance.gvt = div(gvtBalance, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.current_balance.total = div(totalBalance, CONTRACT_ASSET_DECIMAL, amountDecimal);
    // net_returns
    const pwrdReturn = pwrdBalance.minus(netPwrdAmount);
    const gvtReturn = gvtBalance.minus(netGvtAmount);
    const totalReturn = pwrdReturn.plus(gvtReturn);
    result.net_returns.pwrd = div(pwrdReturn, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.net_returns.gvt = div(gvtReturn, CONTRACT_ASSET_DECIMAL, amountDecimal);
    result.net_returns.total = div(totalReturn, CONTRACT_ASSET_DECIMAL, amountDecimal);
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
}
module.exports = {
    ethereumPersonalStats,
    getNetwork,
};