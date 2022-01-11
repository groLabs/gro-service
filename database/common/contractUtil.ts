import { ethers } from 'ethers';
import erc20ABI from '../../abi/ERC20.json';
import {
    getProvider,
    getProviderKey,
    getProviderAvax,
} from './globalUtil';
import {
    ContractNames,
    ContractABIMapping,
} from '../../registry/registry';
import { newSystemLatestContracts } from '../../registry/contracts';
import { getLatestContractsAddress } from '../../registry/registryLoader';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


const stableCoins = [];
const stableCoinsInfo: any = {};
const latestSystemContracts = {};
const latestContractsOnAVAX = {};

// TODO : this is copied from stats/common/contractStorage. Move to global common?
function getLatestSystemContract(contractName, providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestSystemContracts[providerKey]) {
        latestSystemContracts[providerKey] =
            newSystemLatestContracts(providerKey);
    }
    return latestSystemContracts[providerKey][contractName];
}

// TODO : this is copied from stats/common/contractStorage. Move to global common?
function newContract(contractName, contractInfo, providerOrWallet) {
    const contractAddress = contractInfo.address;
    let contract;
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
        showError(
            'contractUtil.ts->newContract()',
            `Address not found for contract: ${contractName}`
        );
        return contract;
    }
    const abiVersion = contractInfo.abiVersion.replace(/\./g, '-');
    const contractABIFileName = ContractABIMapping[contractName];
    // eslint-disable-next-line global-require
    const abi = require(`../../abi/${abiVersion}/${contractABIFileName}.json`);
    contract = new ethers.Contract(contractAddress, abi, providerOrWallet);
    showInfo(`Created new ${contractName} contract.`);
    return { contract, contractInfo };
}

// TODO : this is copied from stats/common/contractStorage. Move to global common?
function getLatestSystemContractOnAVAX(contractName, providerOrWallet) {
    if (!latestContractsOnAVAX[contractName]) {
        const contractInfo = getLatestContractsAddress()[contractName];
        latestContractsOnAVAX[contractName] = newContract(
            contractName,
            contractInfo,
            providerOrWallet
        );
    }
    return latestContractsOnAVAX[contractName];
}

const getGroVault = () => {
    return getLatestSystemContract(ContractNames.groVault, getProviderKey())
        .contract;
}

const getPowerD = () => {
    return getLatestSystemContract(ContractNames.powerD, getProviderKey())
        .contract;
}

const getTokenCounter = () => {
    return getLatestSystemContract(ContractNames.TokenCounter, getProviderKey())
        .contract;
}

const getBuoy = () => {
    return getLatestSystemContract(ContractNames.buoy3Pool, getProviderKey())
        .contract;
}

const getStables = async () => {
    const info = await getStableCoinsInfo();
    return info;
}

const getUSDCeVault = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault, getProviderAvax())
        .contract;
}

const getUSDTeVault = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault, getProviderAvax())
        .contract;
}

const getDAIeVault = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault, getProviderAvax())
        .contract;
}

const getUSDCeVault_1_5 = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault_v1_5, getProviderAvax())
        .contract;
}

const getUSDTeVault_1_5 = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault_v1_5, getProviderAvax())
        .contract;
}

const getDAIeVault_1_5 = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault_v1_5, getProviderAvax())
        .contract;
}

const getUSDCeVault_1_6 = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault_v1_6, getProviderAvax())
        .contract;
}

const getUSDTeVault_1_6 = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault_v1_6, getProviderAvax())
        .contract;
}

const getDAIeVault_1_6 = () => {
    return getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault_v1_6, getProviderAvax())
        .contract;
}

const getStableCoins = async () => {
    if (!stableCoins.length) {
        const latestController = getLatestSystemContract(
            ContractNames.controller,
            getProvider()
        ).contract;
        const stableCoinAddresses = await latestController
            .stablecoins()
            .catch((err) => {
                showError('contractUtil.ts->getStableCoins()', err);
                return [];
            });
        for (let i = 0; i < stableCoinAddresses.length; i += 1) {
            stableCoins.push(
                new ethers.Contract(stableCoinAddresses[i], erc20ABI, getProvider())
            );
        }
    }
    return stableCoins;
}

const getStableCoinsInfo = async () => {
    const keys = Object.keys(stableCoinsInfo);
    if (!keys.length) {
        stableCoinsInfo.decimals = {};
        stableCoinsInfo.symbols = {};
        const coins = await getStableCoins();
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


export {
    getGroVault,
    getPowerD,
    getBuoy,
    getStables,
    getTokenCounter,
    getUSDCeVault,
    getUSDTeVault,
    getDAIeVault,
    getUSDCeVault_1_5,
    getUSDTeVault_1_5,
    getDAIeVault_1_5,
    getUSDCeVault_1_6,
    getUSDTeVault_1_6,
    getDAIeVault_1_6,
};
