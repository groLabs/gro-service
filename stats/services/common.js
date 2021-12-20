const { ethers } = require('ethers');
const { ContractCallError } = require('../../dist/common/error');
const { MESSAGE_TYPES } = require('../../dist/common/discord/discordService');
const { getEvents } = require('../../dist/common/logFilter-new');
const { shortAccount } = require('../../common/digitalUtil');
const { ContractNames } = require('../../dist/registry/registry');
const { getContractsHistory } = require('../../dist/registry/registryLoader');
const { getLatestSystemContractOnAVAX } = require('../common/contractStorage');
const { newContract } = require('../../dist/registry/contracts');

const logger = require('../statsLogger');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

let depositHandlerContracts;
let withdrawHandlerContracts;
const avaxDAIVaultContracts = {};
const avaxUSDCVaultContracts = {};
const avaxUSDTVaultContracts = {};

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

function getContractInfosByAddresses(contractName, accountOwnHistory) {
    const contractHistory = getContractsHistory()[contractName];
    const contractInfos = [];
    if (accountOwnHistory) {
        for (let i = 0; i < contractHistory.length; i += 1) {
            const contractInfo = contractHistory[i];
            if (accountOwnHistory.includes(contractInfo.address)) {
                contractInfos.push(contractInfo);
            }
        }
    } else {
        contractInfos.push(...contractHistory);
    }
    return contractInfos;
}

function getContracts(provider, contractName) {
    const contracts = {};
    const contractHistory = getContractsHistory()[contractName];
    for (let i = 0; i < contractHistory.length; i += 1) {
        const contractInfo = contractHistory[i];
        const contract = newContract(contractName, contractInfo, {
            provider,
        });
        contracts[contractInfo.address] = contract.contract;
    }
    return contracts;
}

function getDistContracts(accountHandlerHistroy, systemHandlerHistroy) {
    let contracts = {};
    if (accountHandlerHistroy) {
        for (let i = 0; i < accountHandlerHistroy.length; i += 1) {
            contracts[accountHandlerHistroy[i]] =
                systemHandlerHistroy[accountHandlerHistroy[i]];
        }
    } else {
        contracts = systemHandlerHistroy;
    }
    return contracts;
}

function getDepositHandlerContracts(provider, accountOwnHistory) {
    if (!depositHandlerContracts) {
        depositHandlerContracts = getContracts(
            provider,
            ContractNames.depositHandler
        );
    }
    const depositHandlers = getDistContracts(
        accountOwnHistory,
        depositHandlerContracts
    );

    return depositHandlers;
}

function getWithdrawHandlerContracts(provider, accountOwnHistory) {
    if (!withdrawHandlerContracts) {
        withdrawHandlerContracts = getContracts(
            provider,
            ContractNames.withdrawHandler
        );
    }
    const withdrawHandlers = getDistContracts(
        accountOwnHistory,
        withdrawHandlerContracts
    );
    return withdrawHandlers;
}

function getAVAXDAIVaultContracts(provider, vaultType, accountOwnHistory) {
    if (!avaxDAIVaultContracts[vaultType]) {
        avaxDAIVaultContracts[vaultType] = getContracts(
            provider,
            ContractNames[vaultType]
        );
    }
    const AVAXDAIVaults = getDistContracts(
        accountOwnHistory,
        avaxDAIVaultContracts[vaultType]
    );
    return AVAXDAIVaults;
}

function getAVAXUSDCVaultContracts(provider, vaultType, accountOwnHistory) {
    if (!avaxDAIVaultContracts[vaultType]) {
        avaxDAIVaultContracts[vaultType] = getContracts(
            provider,
            ContractNames[vaultType]
        );
    }
    const AVAXUSDCVaults = getDistContracts(
        accountOwnHistory,
        avaxDAIVaultContracts[vaultType]
    );
    return AVAXUSDCVaults;
}

function getAVAXUSDTVaultContracts(provider, vaultType, accountOwnHistory) {
    if (!avaxDAIVaultContracts[vaultType]) {
        avaxDAIVaultContracts[vaultType] = getContracts(
            provider,
            ContractNames[vaultType]
        );
    }
    const AVAXUSDTVaults = getDistContracts(
        accountOwnHistory,
        avaxDAIVaultContracts[vaultType]
    );
    return AVAXUSDTVaults;
}

async function getAvaxApproveEventFilters(account, contractName, provider) {
    const abi = [
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'owner',
                    type: 'address',
                },
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'spender',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'value',
                    type: 'uint256',
                },
            ],
            name: 'Approval',
            type: 'event',
        },
    ];
    const filters = [];
    const contractInterfaces = [];
    const latestAvaxVault = getLatestSystemContractOnAVAX(
        contractName,
        provider
    );
    const avaxVaultInfo = latestAvaxVault.contractInfo;
    const { address: vaultAddress, startBlock, tokens } = avaxVaultInfo;
    const coin = new ethers.Contract(tokens[0], abi, provider);
    const filter = coin.filters.Approval(account, vaultAddress);
    filter.fromBlock = startBlock;
    filter.toBlock = 'latest';
    filters.push(filter);
    contractInterfaces.push(coin.interface);

    return { filters, contractInterfaces };
}

function handleError(error, message, account) {
    logger.error(error);
    throw new ContractCallError(message, MESSAGE_TYPES.miniStatsPersonal, {
        embedMessage: getFailedEmbedMessage(account),
    });
}

async function getHandlerEvents(
    account,
    contractName,
    eventName,
    provider,
    accountOwnHistory
) {
    const contractHistory = getContractInfosByAddresses(
        contractName,
        accountOwnHistory
    );
    let contracts;
    switch (contractName) {
        case ContractNames.depositHandler:
            contracts = getDepositHandlerContracts(provider, accountOwnHistory);
            break;
        case ContractNames.withdrawHandler:
            contracts = getWithdrawHandlerContracts(
                provider,
                accountOwnHistory
            );
            break;
        case ContractNames.AVAXDAIVault:
            contracts = getAVAXDAIVaultContracts(
                provider,
                'AVAXDAIVault',
                accountOwnHistory
            );
            break;
        case ContractNames.AVAXUSDCVault:
            contracts = getAVAXUSDCVaultContracts(
                provider,
                'AVAXUSDCVault',
                accountOwnHistory
            );
            break;
        case ContractNames.AVAXUSDTVault:
            contracts = getAVAXUSDTVaultContracts(
                provider,
                'AVAXUSDTVault',
                accountOwnHistory
            );
            break;
        case ContractNames.AVAXDAIVault_v1_5:
            contracts = getAVAXDAIVaultContracts(
                provider,
                'AVAXDAIVault_v1_5',
                accountOwnHistory
            );
            break;
        case ContractNames.AVAXUSDCVault_v1_5:
            contracts = getAVAXUSDCVaultContracts(
                provider,
                'AVAXUSDCVault_v1_5',
                accountOwnHistory
            );
            break;
        case ContractNames.AVAXUSDTVault_v1_5:
            contracts = getAVAXUSDTVaultContracts(
                provider,
                'AVAXUSDTVault_v1_5',
                accountOwnHistory
            );
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
        const contract = contracts[address];
        const filter = contract.filters[eventName](account);
        filter.fromBlock = startBlock;
        filter.toBlock = endBlock;
        eventFilters.push(filter);
        contractInterfaces.push(contract.interface);
    }

    const eventPromise = [];
    for (let i = 0; i < eventFilters.length; i += 1) {
        eventPromise.push(
            getEvents(eventFilters[i], contractInterfaces[i], provider)
        );
    }
    const logs = await Promise.all(eventPromise);

    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        resultLogs.push(...logs[i]);
    }
    return resultLogs;
}

async function getTransferHistories(
    inTransfers,
    outTransfers,
    contractInterfaces,
    provider
) {
    const inLogPromise = [];
    const outLogPromise = [];
    for (let i = 0; i < inTransfers.length; i += 1) {
        inLogPromise.push(
            getEvents(inTransfers[i], contractInterfaces[i], provider)
        );
        outLogPromise.push(
            getEvents(outTransfers[i], contractInterfaces[i], provider)
        );
    }
    const inLogs = await Promise.all(inLogPromise);
    const outLogs = await Promise.all(outLogPromise);
    return {
        inLogs: inLogs.flat(),
        outLogs: outLogs.flat(),
    };
}
async function getAvaxApprovalEvents(account, contractName, provider) {
    const { filters: eventFilters, contractInterfaces } =
        await getAvaxApproveEventFilters(account, contractName, provider);

    const eventPromise = [];
    for (let i = 0; i < eventFilters.length; i += 1) {
        eventPromise.push(
            getEvents(eventFilters[i], contractInterfaces[i], provider)
        );
    }
    const logs = await Promise.all(eventPromise);
    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        resultLogs.push(...logs[i]);
    }

    return resultLogs;
}

module.exports = {
    ZERO_ADDRESS,
    getContracts,
    handleError,
    getHandlerEvents,
    getTransferHistories,
    getAvaxApprovalEvents,
};
