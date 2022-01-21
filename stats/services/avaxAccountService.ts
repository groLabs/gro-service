//@ts-nocheck
import BN from 'bignumber.js';
import { ethers, BigNumber } from 'ethers';
import { ContractNames } from '../../registry/registry';
import { getConfig } from '../../common/configUtil';
import { formatNumber2 } from '../../common/digitalUtil';
import { getContractsHistory } from '../../registry/registryLoader';
import { getLatestSystemContractOnAVAX } from '../common/contractStorage';
import { getAccountAllowance } from './avaxBouncerClaim';
import { getAccountFailTransactionsOnAVAX } from '../handler/failedTransactionHandler';
import {
    ZERO_ADDRESS,
    handleError,
    getHandlerEvents,
    getContracts,
    getTransferHistories,
    getAvaxApprovalEvents,
} from './common';

const logger = require('../statsLogger');

const rpcURL = 'https://api.avax.network/ext/bc/C/rpc';

const provider = new ethers.providers.JsonRpcProvider(rpcURL);

const blockNumberTimestamp = {};
const accountVaultHistories = {};
const systemAvaxVaults = {};

const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const launchTimestamp = getConfig('blockchain.avax_launch_timestamp');

function getLatestAVAXVault(adpaterType) {
    return getLatestSystemContractOnAVAX(adpaterType, provider).contract;
}

function updateAccountVaultHistories(account, adpaterType, logs) {
    const vaults = new Set();
    logs.forEach((log) => vaults.add(log.address));
    vaults.add(getLatestAVAXVault(adpaterType).address);
    if (!accountVaultHistories[account]) {
        accountVaultHistories[account] = {};
    }
    accountVaultHistories[account][adpaterType] = Array.from(vaults);
}

function getAVAXVaultContracts(adpaterType) {
    if (!systemAvaxVaults[adpaterType]) {
        systemAvaxVaults[adpaterType] = getContracts(provider, adpaterType);
    }
    return systemAvaxVaults[adpaterType];
}

async function getTransferEvents(account, adpaterType) {
    const vaultHistory = getContractsHistory()[adpaterType];
    const avaxVaults = getAVAXVaultContracts(adpaterType);
    const inTransfers = [];
    const outTransfers = [];
    const contractInterfaces = [];

    for (let i = 0; i < vaultHistory.length; i += 1) {
        const contractInfo = vaultHistory[i];
        const { startBlock, address } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : 'latest';
        const contract = avaxVaults[address];
        const inFilter = contract.filters.Transfer(null, account);
        inFilter.fromBlock = startBlock;
        inFilter.toBlock = endBlock;
        const outFilter = contract.filters.Transfer(account);
        outFilter.fromBlock = startBlock;
        outFilter.toBlock = endBlock;
        inTransfers.push(inFilter);
        outTransfers.push(outFilter);
        contractInterfaces.push(contract.interface);
    }

    const logs = await getTransferHistories(
        inTransfers,
        outTransfers,
        contractInterfaces,
        provider
    ).catch((error) => {
        logger.error(error);
        handleError(
            error,
            `Get transfer logs from ${adpaterType} vault for account:${account} failed.`,
            account
        );
    });

    return logs;
}

async function calcuateUsdAmountForTransferEvents(logs, decimals) {
    const abi = [
        {
            inputs: [],
            name: 'getPricePerShare',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'totalSupply',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'totalEstimatedAssets',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];

    const pricePerSharePromise = [];
    const totalEstimatedAssetsPromise = [];
    const totalSupplyPromise = [];
    logs.forEach((log) => {
        const { address, blockNumber } = log;
        const vault = new ethers.Contract(address, abi, provider);
        const blockTag = parseInt(blockNumber, 10);
        pricePerSharePromise.push(vault.getPricePerShare({ blockTag }));
        totalEstimatedAssetsPromise.push(
            vault.totalEstimatedAssets({ blockTag })
        );
        totalSupplyPromise.push(vault.totalSupply({ blockTag }));
    });
    const pricePerShareResult = await Promise.all(pricePerSharePromise);
    const totalEstimatedAssetsResult = await Promise.all(
        totalEstimatedAssetsPromise
    );
    const totalSupplyResult = await Promise.all(totalSupplyPromise);

    for (let i = 0; i < pricePerShareResult.length; i += 1) {
        const estimatedPricePerShare = totalEstimatedAssetsResult[i]
            .mul(BigNumber.from(10).pow(decimals))
            .div(totalSupplyResult[i]);
        const log = logs[i];
        const { coin_amount: coinAmount } = log;
        let distPerPrice = pricePerShareResult[i];
        if (distPerPrice.gt(estimatedPricePerShare)) {
            distPerPrice = estimatedPricePerShare;
        }
        const usdAmount = new BN(`${distPerPrice}`).multipliedBy(
            new BN(coinAmount)
        );
        log.amount = formatNumber2(usdAmount, decimals, amountDecimal);
    }
}

function fullData(source, data, fieldName) {
    if (Object.keys(data).length === 0) return;
    source.amount_added[fieldName] = data.amountAdded;
    source.amount_removed[fieldName] = data.amountRemoved;
    source.net_amount_added[fieldName] = data.netAmountAdded;
    source.current_balance[fieldName] = data.currentBalance;
    source.net_returns[fieldName] = data.netReturn;
}

function calculateTotal(source, fieldNames) {
    fieldNames.forEach((fieldName) => {
        const dataSource = source[fieldName];
        const keys = Object.keys(dataSource);
        let total = new BN(0);
        keys.forEach((key) => {
            total = total.plus(new BN(dataSource[key]));
        });
        dataSource.total = total.toFixed(amountDecimal);
    });
}
async function getBlockNumberTimestamp(blockNumber) {
    if (!blockNumberTimestamp[blockNumber]) {
        // logger.info(`AVAX: Append timestamp for blockNumber ${blockNumber}`);
        const blockObject = await provider.getBlock(parseInt(blockNumber, 10));
        blockNumberTimestamp[blockNumber] = `${blockObject.timestamp}`;
    }
    return blockNumberTimestamp[blockNumber];
}

async function fetchTimestamp(transaction) {
    const { blockNumber } = transaction;
    transaction.timestamp = await getBlockNumberTimestamp(`${blockNumber}`);
    return transaction;
}

async function appendEventTimestamp(transactions) {
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(transactions[i]));
    }
    await Promise.all(promise);
}

function fullTransactionField(source, events, eventType) {
    const result = [];
    events.forEach((event) => {
        result.push({
            token: event.token,
            spender: event.spender,
            hash: event.transactionHash,
            usd_amount: event.amount,
            coin_amount: event.coin_amount,
            block_number: `${event.blockNumber}`,
            timestamp: event.timestamp,
        });
    });
    source.transaction[eventType] = result;
}

async function getDepositHistory(account, token, adpaterType, decimals) {
    let needWrited = false;
    let adapterHistories;
    // query history
    if (!accountVaultHistories[account]) accountVaultHistories[account] = {};
    const accountAdapters = accountVaultHistories[account][adpaterType];
    if (accountAdapters) {
        adapterHistories = accountAdapters;
    } else {
        needWrited = true;
    }
    const logs = await getHandlerEvents(
        account,
        adpaterType,
        'LogDeposit',
        provider,
        adapterHistories
    ).catch((error) => {
        handleError(
            error,
            `Get deposit logs from ${adpaterType} vault by account:${account} failed.`,
            account
        );
    });

    // write data to history memory
    if (needWrited) {
        updateAccountVaultHistories(account, adpaterType, logs);
    }

    const result = [];
    if (!(logs as any).length) return result;
    await appendEventTimestamp(logs);
    (logs as any).forEach((log) => {
        log.amount = formatNumber2(log.args[1], decimals, amountDecimal);
        log.coin_amount = formatNumber2(log.args[2], decimals, amountDecimal);
        log.token = `gro${token}`;
        result.push(log);
    });
    return result;
}

async function getWithdrawHistory(account, token, adpaterType, decimals) {
    // let needWrited = false;
    let adapterHistories;
    if (!accountVaultHistories[account]) accountVaultHistories[account] = {};
    const accountAdapters = accountVaultHistories[account][adpaterType];
    if (accountAdapters) {
        adapterHistories = accountAdapters;
    }
    //  else {
    //     needWrited = true;
    // }
    const logs = await getHandlerEvents(
        account,
        adpaterType,
        'LogWithdrawal',
        provider,
        adapterHistories
    ).catch((error) => {
        handleError(
            error,
            `Get withdraw log from ${adpaterType} valut for account:${account} failed.`,
            account
        );
    });

    // write data to history memory:doesn't need update for abover deposit already done
    // if (needWrited) {
    //     updateAccountVaultHistories(account, adpaterType, logs);
    // }

    const result = [];
    if (!(logs as any).length) return result;
    await appendEventTimestamp(logs);
    (logs as any).forEach((log) => {
        log.amount = formatNumber2(log.args[1], decimals, amountDecimal);
        log.coin_amount = formatNumber2(log.args[2], decimals, amountDecimal);
        log.token = `gro${token}`;
        result.push(log);
    });
    return result;
}

interface ILogs {
    inLogs: any;
    outLogs: any;
}

async function getVaultTokenTransferHistory(
    account,
    token,
    adpaterType,
    decimals
) {
    const logs = await getTransferEvents(account, adpaterType);

    const transferIn = [];
    const transferOut = [];
    const { inLogs, outLogs } = logs as ILogs;
    await appendEventTimestamp(inLogs);
    await appendEventTimestamp(outLogs);
    inLogs.forEach((log) => {
        if (log.args[0] === ZERO_ADDRESS) return;
        log.coin_amount = formatNumber2(log.args[2], decimals, amountDecimal);
        log.token = `gro${token}`;
        transferIn.push(log);
    });
    outLogs.forEach((log) => {
        if (log.args[1] === ZERO_ADDRESS) return;
        log.coin_amount = formatNumber2(log.args[2], decimals, amountDecimal);
        log.token = `gro${token}`;
        transferOut.push(log);
    });
    await calcuateUsdAmountForTransferEvents(inLogs, decimals);
    await calcuateUsdAmountForTransferEvents(outLogs, decimals);
    return { inLogs: transferIn, outLogs: transferOut };
}

async function getApprovalHistory(account, contractName, decimals, token) {
    const logs = await getAvaxApprovalEvents(
        account,
        contractName,
        provider
    ).catch((error) => {
        handleError(
            error,
            `Get approval filter of ${contractName} for account:${account} failed.`,
            account
        );
    });
    const result = [];
    if (!(logs as any).length) return result;
    await appendEventTimestamp(logs);
    (logs as any).forEach((log) => {
        const { args } = log;
        const amount = formatNumber2(args[2], decimals, amountDecimal);
        log.amount = amount;
        log.coin_amount = amount;
        log.spender = args[1].toString();
        log.token = token;
        result.push(log);
    });
    return result;
}

async function getUserAllowanceClaimed(vaultContract, vaultType, account) {
    let claimed = true;
    const vaultV1 = [
        ContractNames.AVAXDAIVault,
        ContractNames.AVAXUSDTVault,
        ContractNames.AVAXUSDCVault,
    ];
    if (vaultV1.includes(vaultType)) {
        const latestBouncer = getLatestSystemContractOnAVAX(
            ContractNames.AVAXBouncer,
            provider
        ).contract;
        const claimedAmount = await latestBouncer.claimed(
            vaultContract.address,
            account
        );
        if (claimedAmount.isZero()) {
            claimed = false;
        }
    } else {
        claimed = await vaultContract.claimed(account);
    }
    return claimed;
}

async function singleVaultEvents(account, adpaterType, token, decimals) {
    // current balance
    const latestVault = getLatestAVAXVault(adpaterType);
    const balance = await latestVault.balanceOf(account);

    // user's claimed
    const claimed = await getUserAllowanceClaimed(
        latestVault,
        adpaterType,
        account
    );
    let eventsPromise;

    if (!claimed && balance.isZero()) {
        eventsPromise = [
            Promise.resolve([]),
            Promise.resolve([]),
            Promise.resolve({ inLogs: [], outLogs: [] }),
            Promise.resolve([]),
        ];
    } else {
        eventsPromise = [
            getDepositHistory(account, token, adpaterType, decimals),
            getWithdrawHistory(account, token, adpaterType, decimals),
            getVaultTokenTransferHistory(account, token, adpaterType, decimals),
            getApprovalHistory(account, adpaterType, decimals, token),
        ];
    }

    const [depositEvents, withdrawEvents, transferEvents, approvalEvents] =
        await Promise.all(eventsPromise);

    let depositAmount = new BN(0);
    let withdrawAmount = new BN(0);
    const depositEventHashs = [];
    depositEvents.forEach((log) => {
        depositAmount = depositAmount.plus(new BN(log.amount));
        depositEventHashs.push(log.transactionHash);
    });
    withdrawEvents.forEach((log) => {
        withdrawAmount = withdrawAmount.plus(new BN(log.amount));
    });

    transferEvents.inLogs.forEach((log) => {
        depositAmount = depositAmount.plus(new BN(log.amount));
    });
    transferEvents.outLogs.forEach((log) => {
        withdrawAmount = withdrawAmount.plus(new BN(log.amount));
    });

    const netAmountAdded = depositAmount.minus(withdrawAmount);

    let currentBalance = formatNumber2(0, 0, amountDecimal);
    if (!balance.isZero()) {
        const perPrice = await latestVault.getPricePerShare();
        const totalSupply = await latestVault.totalSupply();
        let distPerPrice = perPrice;
        if (!totalSupply.isZero()) {
            const totalEstimatedAssets =
                await latestVault.totalEstimatedAssets();
            const estimatedPerPrice = totalEstimatedAssets
                .mul(BigNumber.from(10).pow(decimals))
                .div(totalSupply);
            if (perPrice.gt(estimatedPerPrice)) {
                distPerPrice = estimatedPerPrice;
            }
        }
        const amount = balance.mul(distPerPrice);
        currentBalance = formatNumber2(amount, decimals * 2, amountDecimal);
    }

    // net return
    const netReturn = new BN(currentBalance).minus(netAmountAdded);

    // handle approval event
    const distApprovalEvents = [];
    approvalEvents.forEach((log) => {
        const { transactionHash } = log;
        if (!depositEventHashs.includes(transactionHash)) {
            distApprovalEvents.push(log);
        }
    });
    return {
        depositEvents,
        withdrawEvents,
        transferEvents,
        currentBalance,
        approvalEvents: distApprovalEvents,
        netAmountAdded: netAmountAdded.toFixed(amountDecimal),
        netReturn: netReturn.toFixed(amountDecimal),
        amountAdded: depositAmount.toFixed(amountDecimal),
        amountRemoved: withdrawAmount.toFixed(amountDecimal),
    };
}

async function avaxPersonalStats(account) {
    const result = {
        status: 'error',
        launch_timestamp: launchTimestamp,
        amount_added: {},
        amount_removed: {},
        net_amount_added: {},
        current_balance: {},
        net_returns: {},
        transaction: {
            deposits: undefined,
            withdrawals: undefined,
            transfers_in: undefined,
            transfers_out: undefined,
            approvals: undefined,
            failures: undefined,
        },
        gro_gate: {},
        network_id: undefined,
    };
    // network id
    // const network = await provider.getNetwork();
    // console.log(`avax network: ${JSON.stringify(network)}`);
    result.network_id = '43114'; // getNetwork not work for avax

    try {
        // deposit & withdraw & transfer & approval events
        const vaultEventsPromise = [
            singleVaultEvents(account, ContractNames.AVAXDAIVault, 'DAI.e', 18),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDCVault,
                'USDC.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDTVault,
                'USDT.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXDAIVault_v1_5,
                'DAI.e',
                18
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDCVault_v1_5,
                'USDC.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDTVault_v1_5,
                'USDT.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXDAIVault_v1_6,
                'DAI.e',
                18
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDCVault_v1_6,
                'USDC.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDTVault_v1_6,
                'USDT.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXDAIVault_v1_7,
                'DAI.e',
                18
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDCVault_v1_7,
                'USDC.e',
                6
            ),
            singleVaultEvents(
                account,
                ContractNames.AVAXUSDTVault_v1_7,
                'USDT.e',
                6
            ),
        ];
        const [
            daiVaultEvents,
            usdcVaultEvents,
            usdtVaultEvents,
            daiVaultEvents1,
            usdcVaultEvents1,
            usdtVaultEvents1,
            daiVaultEvents2,
            usdcVaultEvents2,
            usdtVaultEvents2,
            daiVaultEvents3,
            usdcVaultEvents3,
            usdtVaultEvents3,
        ] = await Promise.all(vaultEventsPromise);

        fullData(result, daiVaultEvents, 'groDAI.e_vault');
        fullData(result, usdcVaultEvents, 'groUSDC.e_vault');
        fullData(result, usdtVaultEvents, 'groUSDT.e_vault');
        fullData(result, daiVaultEvents1, 'groDAI.e_vault_v1_5');
        fullData(result, usdcVaultEvents1, 'groUSDC.e_vault_v1_5');
        fullData(result, usdtVaultEvents1, 'groUSDT.e_vault_v1_5');
        fullData(result, daiVaultEvents2, 'groDAI.e_vault_v1_6');
        fullData(result, usdcVaultEvents2, 'groUSDC.e_vault_v1_6');
        fullData(result, usdtVaultEvents2, 'groUSDT.e_vault_v1_6');
        fullData(result, daiVaultEvents3, 'groDAI.e_vault_v1_7');
        fullData(result, usdcVaultEvents3, 'groUSDC.e_vault_v1_7');
        fullData(result, usdtVaultEvents3, 'groUSDT.e_vault_v1_7');

        calculateTotal(result, [
            'amount_added',
            'amount_removed',
            'net_amount_added',
            'current_balance',
            'net_returns',
        ]);

        // deposit
        const depositEvents = [
            ...daiVaultEvents.depositEvents,
            ...usdcVaultEvents.depositEvents,
            ...usdtVaultEvents.depositEvents,
            ...daiVaultEvents1.depositEvents,
            ...usdcVaultEvents1.depositEvents,
            ...usdtVaultEvents1.depositEvents,
            ...daiVaultEvents2.depositEvents,
            ...usdcVaultEvents2.depositEvents,
            ...usdtVaultEvents2.depositEvents,
        ];
        fullTransactionField(result, depositEvents, 'deposits');

        // withdrawal
        const withdrawEvents = [
            ...daiVaultEvents.withdrawEvents,
            ...usdcVaultEvents.withdrawEvents,
            ...usdtVaultEvents.withdrawEvents,
            ...daiVaultEvents1.withdrawEvents,
            ...usdcVaultEvents1.withdrawEvents,
            ...usdtVaultEvents1.withdrawEvents,
            ...daiVaultEvents2.withdrawEvents,
            ...usdcVaultEvents2.withdrawEvents,
            ...usdtVaultEvents2.withdrawEvents,
        ];
        fullTransactionField(result, withdrawEvents, 'withdrawals');

        // transfer in & transfer out
        const transferIn = [
            ...daiVaultEvents.transferEvents.inLogs,
            ...usdcVaultEvents.transferEvents.inLogs,
            ...usdtVaultEvents.transferEvents.inLogs,
            ...daiVaultEvents1.transferEvents.inLogs,
            ...usdcVaultEvents1.transferEvents.inLogs,
            ...usdtVaultEvents1.transferEvents.inLogs,
            ...daiVaultEvents2.transferEvents.inLogs,
            ...usdcVaultEvents2.transferEvents.inLogs,
            ...usdtVaultEvents2.transferEvents.inLogs,
        ];
        const transferOut = [
            ...daiVaultEvents.transferEvents.outLogs,
            ...usdcVaultEvents.transferEvents.outLogs,
            ...usdtVaultEvents.transferEvents.outLogs,
            ...daiVaultEvents1.transferEvents.outLogs,
            ...usdcVaultEvents1.transferEvents.outLogs,
            ...usdtVaultEvents1.transferEvents.outLogs,
            ...daiVaultEvents2.transferEvents.outLogs,
            ...usdcVaultEvents2.transferEvents.outLogs,
            ...usdtVaultEvents2.transferEvents.outLogs,
        ];
        fullTransactionField(result, transferIn, 'transfers_in');
        fullTransactionField(result, transferOut, 'transfers_out');

        // approvals
        const approvals = [
            ...daiVaultEvents.approvalEvents,
            ...usdcVaultEvents.approvalEvents,
            ...usdtVaultEvents.approvalEvents,
            ...daiVaultEvents1.approvalEvents,
            ...usdcVaultEvents1.approvalEvents,
            ...usdtVaultEvents1.approvalEvents,
            ...daiVaultEvents2.approvalEvents,
            ...usdcVaultEvents2.approvalEvents,
            ...usdtVaultEvents2.approvalEvents,
        ];
        fullTransactionField(result, approvals, 'approvals');

        // Failed transactions
        const failTransactions = await getAccountFailTransactionsOnAVAX(
            account
        ).catch((error) => {
            logger.error(error);
            return [];
        });
        const failedItems = [];
        for (let i = 0; i < failTransactions.length; i += 1) {
            const { contractName, hash, blockNumber, timeStamp, to } =
                failTransactions[i];
            failedItems.push({
                hash,
                contract_name: contractName,
                contract_address: to,
                timestamp: timeStamp,
                block_number: blockNumber,
            });
        }
        result.transaction.failures = failedItems;
        // gro gate
        const allowance = await getAccountAllowance(account, provider);
        result.gro_gate = allowance;
        result.status = 'ok';
    } catch (error) {
        logger.error(
            `Get personal stats for ${account} from avalanche failed.`
        );
        logger.error(error);
    }

    return result;
}

export { avaxPersonalStats };
