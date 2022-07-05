/* eslint-disable import/no-dynamic-require */
import { ethers } from 'ethers';
import {
    getWalletNonceManager,
    getAlchemyRpcProvider,
} from '../common/chainUtil';
import {
    getLatestContractsAddress,
    getLatestContractsAddressByAddress,
    getContractsHistory,
} from './registryLoader';
import { ContractNames, ContractABIMapping } from './registry';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

function renameDuplicatedFactorEntry(abi) {
    const keys = abi.keys();
    // eslint-disable-next-line no-restricted-syntax
    for (const key of keys) {
        const node = abi[key];
        if (node.name === 'factor' && node.inputs.length > 0) {
            node.name = 'factorWithParam';
        }
    }
    return abi;
}

function newContract(contractName, contractInfo, signerInfo) {
    const { providerKey, accountKey, provider } = signerInfo;
    let managerOrProvicer;
    if (provider) {
        managerOrProvicer = provider;
    } else if (accountKey) {
        managerOrProvicer = getWalletNonceManager(providerKey, accountKey);
    } else {
        managerOrProvicer = getAlchemyRpcProvider(providerKey);
    }

    const contractAddress = contractInfo.address;
    let contract;
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
        logger.error(`Not find address for contract: ${contractName}`);
        return contract;
    }
    const abiVersion = contractInfo.abiVersion.replace(/\./g, '-');
    const contractABIFileName = ContractABIMapping[contractName];
    // eslint-disable-next-line global-require
    let abi = require(`../abi/${abiVersion}/${contractABIFileName}.json`);
    if (
        contractName === ContractNames.groVault ||
        contractName === ContractNames.powerD
    ) {
        abi = renameDuplicatedFactorEntry(abi);
    }
    contract = new ethers.Contract(contractAddress, abi, managerOrProvicer);
    logger.info(`Created new ${contractName} contract.`);
    return { contract, contractInfo };
}

function newLatestContract(contractName, signerInfo) {
    const contractInfo = getLatestContractsAddress()[contractName];
    return newContract(contractName, contractInfo, signerInfo);
}

function getValidContractByBlock(contractName, blockNumber, signerInfo) {
    const contractInfo = getContractsHistory()[contractName];
    if (!contractInfo) {
        logger.error(`Not found contract info by name: ${contractName}`);
        return;
    }
    let distContractInfo;
    for (let i = 0; i < contractInfo.length; i += 1) {
        const info = contractInfo[i];
        const { startBlock, endBlock: _endBlock } = info;
        const endBlock = _endBlock || Infinity;
        if (blockNumber >= startBlock && blockNumber <= endBlock) {
            distContractInfo = info;
            break;
        }
    }
    if (!distContractInfo) {
        logger.error(
            `Not found contract info by block: ${blockNumber} for contract: ${contractName}`
        );
        return;
    }
    return newContract(contractName, distContractInfo, signerInfo);
}

function newLatestContractByAddress(address, signerInfo) {
    const contractInfo = getLatestContractsAddressByAddress()[address];
    let contract;
    if (!contractInfo) {
        logger.error(`Can't find contract information for address: ${address}`);
        return contract;
    }
    const { contractName } = contractInfo;
    contract = newContract(contractName, contractInfo, signerInfo);
    return contract;
}

function newSystemLatestContracts(signerInfo) {
    const contractsName = Object.keys(ContractNames);
    const contracts = {};
    for (let i = 0; i < contractsName.length; i += 1) {
        const contractName = ContractNames[contractsName[i]];
        if (contractName.indexOf('AVAX') < 0) {
            contracts[contractName] = newLatestContract(
                contractName,
                signerInfo
            );
        }
    }
    logger.info('new system latest contracts working');
    return contracts;
}

async function newSystemLatestVaultStrategyContracts(signerInfo) {
    const result = {};
    const vaultsAddress = [];
    const controller = newLatestContract(
        ContractNames.controller,
        signerInfo
    ).contract;

    const vaultAddresses = await controller.vaults();
    for (let i = 0; i < vaultAddresses.length; i += 1) {
        const vaultAdapterAddress = vaultAddresses[i];
        vaultsAddress.push(vaultAdapterAddress);
        const vaultAdapter = newLatestContractByAddress(
            vaultAdapterAddress,
            signerInfo
        );
        result[vaultAdapterAddress] = {
            contract: vaultAdapter.contract,
            contractInfo: vaultAdapter.contractInfo,
            vault: {},
        };
    }

    // const curveVaultAddress = await controller.curveVault();
    // vaultsAddress.push(curveVaultAddress);
    // const curveVaultAdapter = newLatestContractByAddress(
    //     curveVaultAddress,
    //     signerInfo
    // );
    // result[curveVaultAddress] = {
    //     contract: curveVaultAdapter.contract,
    //     contractInfo: curveVaultAdapter.contractInfo,
    //     vault: {},
    // };

    // init vault for every vault adapter
    const vaultAdapterAddresses = Object.keys(result);
    for (let i = 0; i < vaultAdapterAddresses.length; i += 1) {
        const { contract: vaultAdapter, vault } =
            result[vaultAdapterAddresses[i]];
        // eslint-disable-next-line no-await-in-loop
        const yearnVaultAddress = await vaultAdapter.vault();
        const vaultInstance = newLatestContractByAddress(
            yearnVaultAddress,
            signerInfo
        );
        vault.contract = vaultInstance.contract;
        vault.contractInfo = vaultInstance.contractInfo;
        vault.strategies = [];
    }

    // init strategy for every vault
    let k = 0;
    const strategiesAddr = [
        '0xDea436e15B40E7B707A7002A749f416dFE5B383F',
        '0x4d5b5376Cbcc001bb4F8930208828Ab87D121dA8',
        '0xD370998b2E7941151E7BB9f6e337A12F337D0682',
        '0x8b335D3E266389Ae08A2F22b01D33813d40ED8Fd',
        '0xDE5a25415C637b52d59Ef980b29a5fDa8dC3C70B',
    ];
    for (let i = 0; i < vaultAdapterAddresses.length; i += 1) {
        const { contract: vaultAdapter, vault } =
            result[vaultAdapterAddresses[i]];
        const { contract: vaultInstance, strategies } = vault;
        // eslint-disable-next-line no-await-in-loop
        let strategyLength = await vaultAdapter.getStrategiesLength();
        if (i == 1) {
            strategyLength = 2;
        }
        result[vaultAdapterAddresses[i]].strategyLength = strategyLength;
        for (let j = 0; j < strategyLength; j += 1) {
            // eslint-disable-next-line no-await-in-loop
            let strategyAddress = await vaultInstance.withdrawalQueue(j);
            if (
                strategyAddress == '0x0000000000000000000000000000000000000000'
            ) {
                strategyAddress = strategiesAddr[k];
            }
            const strategy = newLatestContractByAddress(
                strategyAddress,
                signerInfo
            );
            strategies.push({
                contract: strategy.contract,
                contractInfo: strategy.contractInfo,
            });
            k = k + 1;
        }
    }
    return {
        vaultsAddress,
        contracts: result,
    };
}

export {
    newContract,
    newLatestContract,
    newSystemLatestContracts,
    newSystemLatestVaultStrategyContracts,
    getValidContractByBlock,
};
