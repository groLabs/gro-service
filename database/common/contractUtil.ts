import { ethers } from 'ethers';
import erc20ABI from '../../abi/ERC20.json';
import {
    getProvider,
    getProviderKey,
    getProviderAvax,
    errorObj,
} from './globalUtil';
import {
    ContractNames,
    ContractABIMapping,
    getContractHistory,
} from '../../registry/registry';
import { newSystemLatestContracts } from '../../registry/contracts';
import { getLatestContractsAddress } from '../../registry/registryLoader';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import { ICall } from '../interfaces/ICall';
import { QUERY_SUCCESS } from '../constants';


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

const getGroVault = () =>
    getLatestSystemContract(ContractNames.groVault, getProviderKey()).contract;

const getPowerD = () =>
    getLatestSystemContract(ContractNames.powerD, getProviderKey()).contract;

const getTokenCounter = () =>
    getLatestSystemContract(ContractNames.TokenCounter, getProviderKey()).contract;

const getGroDaoToken = () =>
    getLatestSystemContract(ContractNames.GroDAOToken, getProviderKey()).contract;

const getBuoy = () =>
    getLatestSystemContract(ContractNames.buoy3Pool, getProviderKey()).contract;

const getStables = async () => {
    const info = await getStableCoinsInfo();
    return info;
}

const getUni2GvtGro = () =>
    getLatestSystemContract(ContractNames.UniswapV2Pair_gvt_gro, getProviderKey()).contract;

const getUni2GroUsdc = () =>
    getLatestSystemContract(ContractNames.UniswapV2Pair_gro_usdc, getProviderKey()).contract;

const getLpTokenStakerV1 = () =>
    getLatestSystemContract(ContractNames.LPTokenStakerV1, getProviderKey()).contract;

const getLpTokenStakerV2 = () =>
    getLatestSystemContract(ContractNames.LPTokenStakerV2, getProviderKey()).contract;

const getGroVesting = () =>
    getLatestSystemContract(ContractNames.GroVesting, getProviderKey()).contract;

const getCurve_PWRD3CRV = () =>
    getLatestSystemContract(ContractNames.Curve_PWRD3CRV, getProvider()).contract;

// Vaults ETH - Not used (and ABI probably wrong as they return exception eg: when calling totalAssets)
// const getDAIVault = () =>
//     getLatestSystemContract(ContractNames.DAIVault, getProviderKey()).contract;

// const getUSDCVault = () =>
//     getLatestSystemContract(ContractNames.USDCVault, getProviderKey()).contract;

// const getUSDTVault = () =>
//     getLatestSystemContract(ContractNames.USDTVault, getProviderKey()).contract;

// Vault adaptors ETH
const getDAIVaultAdaptor = () => 
    getLatestSystemContract(ContractNames.DAIVaultAdaptor, getProviderKey()).contract;

const getUSDCVaultAdaptor = () =>
    getLatestSystemContract(ContractNames.USDCVaultAdaptor, getProviderKey()).contract;

const getUSDTVaultAdaptor = () =>
    getLatestSystemContract(ContractNames.USDTVaultAdaptor, getProviderKey()).contract;


// Vaults AVAX
const getUSDCeVault = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault, getProviderAvax()).contract;

const getUSDTeVault = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault, getProviderAvax()).contract;

const getDAIeVault = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault, getProviderAvax()).contract;

const getUSDCeVault_1_5 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault_v1_5, getProviderAvax()).contract;

const getUSDTeVault_1_5 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault_v1_5, getProviderAvax()).contract;

const getDAIeVault_1_5 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault_v1_5, getProviderAvax()).contract;

const getUSDCeVault_1_6 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault_v1_6, getProviderAvax()).contract;

const getUSDTeVault_1_6 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault_v1_6, getProviderAvax()).contract;

const getDAIeVault_1_6 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault_v1_6, getProviderAvax()).contract;

const getUSDCeVault_1_7 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault_v1_7, getProviderAvax()).contract;

const getUSDTeVault_1_7 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault_v1_7, getProviderAvax()).contract;

const getDAIeVault_1_7 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault_v1_7, getProviderAvax()).contract;

const getUSDCeVault_1_9_internal = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCVault_v1_9_internal, getProviderAvax()).contract;

const getUSDTeVault_1_9_internal = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTVault_v1_9_internal, getProviderAvax()).contract;

const getDAIeVault_1_9_internal = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIVault_v1_9_internal, getProviderAvax()).contract;

// Strategies
const getUSDCeStrategy = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCStrategy, getProviderAvax()).contract;

const getUSDTeStrategy = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTStrategy, getProviderAvax()).contract;

const getDAIeStrategy = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIStrategy, getProviderAvax()).contract;

const getUSDCeStrategy_1_5 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCStrategy_v1_5, getProviderAvax()).contract;

const getUSDTeStrategy_1_5 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTStrategy_v1_5, getProviderAvax()).contract;

const getDAIeStrategy_1_5 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIStrategy_v1_5, getProviderAvax()).contract;

const getUSDCeStrategy_1_6 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCStrategy_v1_6, getProviderAvax()).contract;

const getUSDTeStrategy_1_6 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTStrategy_v1_6, getProviderAvax()).contract;

const getDAIeStrategy_1_6 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIStrategy_v1_6, getProviderAvax()).contract;

const getUSDCeStrategy_1_7 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDCStrategy_v1_7, getProviderAvax()).contract;

const getUSDTeStrategy_1_7 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXUSDTStrategy_v1_7, getProviderAvax()).contract;

const getDAIeStrategy_1_7 = () =>
    getLatestSystemContractOnAVAX(ContractNames.AVAXDAIStrategy_v1_7, getProviderAvax()).contract;

// Stablecoins Avax
const getDAI_e = () => getLatestSystemContract(ContractNames.DAI_e, getProviderAvax()).contract;
const getUSDC_e = () => getLatestSystemContract(ContractNames.USDC_e, getProviderAvax()).contract;
const getUSDT_e = () => getLatestSystemContract(ContractNames.USDT_e, getProviderAvax()).contract;

const getStableFromStrategyName = (contractName: string) => {
    try {
        let stableAddress = '';
        switch (contractName) {
            case ContractNames.AVAXDAIStrategy:
            case ContractNames.AVAXDAIStrategy_v1_5:
            case ContractNames.AVAXDAIStrategy_v1_6:
            case ContractNames.AVAXDAIStrategy_v1_7:
                stableAddress = getDAI_e().address;
                break;
            case ContractNames.AVAXUSDCStrategy:
            case ContractNames.AVAXUSDCStrategy_v1_5:
            case ContractNames.AVAXUSDCStrategy_v1_6:
            case ContractNames.AVAXUSDCStrategy_v1_7:
                stableAddress = getUSDC_e().address;
                break;
            case ContractNames.AVAXUSDTStrategy:
            case ContractNames.AVAXUSDTStrategy_v1_5:
            case ContractNames.AVAXUSDTStrategy_v1_6:
            case ContractNames.AVAXUSDTStrategy_v1_7:
                stableAddress = getUSDT_e().address;
                break;
            default:
                showError(
                    'contractUtil.ts->getStableFromStrategyName()',
                    'Strategy name not found'
                );
                return null;
        }
        return new ethers.Contract(
            stableAddress,
            erc20ABI,
            getProviderAvax()
        );
    } catch (err) {
        showError('contractUtil.ts->getStableFromStrategyName()', err);
        return null;
    }
}

const getVaultFromContractName = (contractName: string) => {
    try {
        let sc;
        switch (contractName) {
            // Avalanche
            case ContractNames.AVAXDAIVault:
                sc = getDAIeVault();
                break;
            case ContractNames.AVAXUSDCVault:
                sc = getUSDCeVault();
                break;
            case ContractNames.AVAXUSDTVault:
                sc = getUSDTeVault();
                break;
            case ContractNames.AVAXDAIVault_v1_5:
                sc = getDAIeVault_1_5();
                break;
            case ContractNames.AVAXUSDCVault_v1_5:
                sc = getUSDCeVault_1_5();
                break;
            case ContractNames.AVAXUSDTVault_v1_5:
                sc = getUSDTeVault_1_5();
                break;
            case ContractNames.AVAXDAIVault_v1_6:
                sc = getDAIeVault_1_6();
                break;
            case ContractNames.AVAXUSDCVault_v1_6:
                sc = getUSDCeVault_1_6();
                break;
            case ContractNames.AVAXUSDTVault_v1_6:
                sc = getUSDTeVault_1_6();
                break;
            case ContractNames.AVAXDAIVault_v1_7:
                sc = getDAIeVault_1_7();
                break;
            case ContractNames.AVAXUSDCVault_v1_7:
                sc = getUSDCeVault_1_7();
                break;
            case ContractNames.AVAXUSDTVault_v1_7:
                sc = getUSDTeVault_1_7();
                break;
            case ContractNames.AVAXDAIVault_v1_9_internal:
                sc = getDAIeVault_1_9_internal();
                break;
            case ContractNames.AVAXUSDCVault_v1_9_internal:
                sc = getUSDCeVault_1_9_internal();
                break;
            case ContractNames.AVAXUSDTVault_v1_9_internal:
                sc = getUSDTeVault_1_9_internal();
                break;
            case ContractNames.DAIVault:
                sc = getDAIVaultAdaptor();
                break;
            case ContractNames.USDCVault:
                sc = getUSDCVaultAdaptor();
                break;
            case ContractNames.USDTVault:
                sc = getUSDTVaultAdaptor();
                break;
            default:
                showError(
                    'contractUtil.ts->getVaultFromContractName()',
                    'Vault name not found'
                );
                return null;
        }
        return sc;
    } catch (err) {
        showError('contractUtil.ts->getVaultFromContractName()', err);
        return null;
    }
}

const getStrategyFromContractName = (contractName: string) => {
    try {
        let sc;
        switch (contractName) {
            case ContractNames.AVAXDAIStrategy:
                sc = getDAIeStrategy();
                break;
            case ContractNames.AVAXUSDCStrategy:
                sc = getUSDCeStrategy();
                break;
            case ContractNames.AVAXUSDTStrategy:
                sc = getUSDTeStrategy();
                break;
            case ContractNames.AVAXDAIStrategy_v1_5:
                sc = getDAIeStrategy_1_5();
                break;
            case ContractNames.AVAXUSDCStrategy_v1_5:
                sc = getUSDCeStrategy_1_5();
                break;
            case ContractNames.AVAXUSDTStrategy_v1_5:
                sc = getUSDTeStrategy_1_5();
                break;
            case ContractNames.AVAXDAIStrategy_v1_6:
                sc = getDAIeStrategy_1_6();
                break;
            case ContractNames.AVAXUSDCStrategy_v1_6:
                sc = getUSDCeStrategy_1_6();
                break;
            case ContractNames.AVAXUSDTStrategy_v1_6:
                sc = getUSDTeStrategy_1_6();
                break;
            case ContractNames.AVAXDAIStrategy_v1_7:
                sc = getDAIeStrategy_1_7();
                break;
            case ContractNames.AVAXUSDCStrategy_v1_7:
                sc = getUSDCeStrategy_1_7();
                break;
            case ContractNames.AVAXUSDTStrategy_v1_7:
                sc = getUSDTeStrategy_1_7();
                break;
            default:
                showError(
                    'contractUtil.ts->getStrategyFromContractName()',
                    'Strategy name not found'
                );
                return null;
        }
        return sc;
    } catch (err) {
        showError('contractUtil.ts->getStrategyFromContractName()', err);
        return null;
    }
}

const getContractInfoHistory = async (
    contractName: string,
    block: number,
): Promise<ICall> => {
    const contracts = await getContractHistory(contractName);
    for (const contract of contracts) {
        const endBlock = (contract.endBlock == null || isNaN(contract.endBlock))
            ? 99999999999
            : contract.endBlock;
        if (block >= contract.startBlock && block < endBlock)
            return {
                status: QUERY_SUCCESS,
                data: contract,
            }
    }
    const errMsg = `Contract <${contractName}> not found for block ${block}`
    showError('contractUtil.ts->getContractInfoHistory()', errMsg);
    return errorObj(errMsg);
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
    getGroDaoToken,
    getBuoy,
    getStables,
    getTokenCounter,
    getUni2GvtGro,
    getUni2GroUsdc,
    getLpTokenStakerV1,
    getLpTokenStakerV2,
    getCurve_PWRD3CRV,
    getUSDCeVault,
    getUSDTeVault,
    getDAIeVault,
    getUSDCeVault_1_5,
    getUSDTeVault_1_5,
    getDAIeVault_1_5,
    getUSDCeVault_1_6,
    getUSDTeVault_1_6,
    getDAIeVault_1_6,
    getUSDCeVault_1_7,
    getUSDTeVault_1_7,
    getDAIeVault_1_7,
    getUSDCeVault_1_9_internal,
    getUSDTeVault_1_9_internal,
    getDAIeVault_1_9_internal,
    getDAI_e,
    getUSDC_e,
    getUSDT_e,
    getGroVesting,
    getContractInfoHistory,
    getVaultFromContractName,
    getStableFromStrategyName,
    getStrategyFromContractName,
};
