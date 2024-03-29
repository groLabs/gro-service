import fs from 'fs';
import { ethers } from 'ethers';
import { getConfig } from '../common/configUtil';
import {
    getAlchemyRpcProvider,
    getAvaxFullNodeRpcProvider,
} from '../common/chainUtil';
import { SettingError } from '../common/error';
const registryABI = require('./Registry.json');
const erc20ABI = require('../abi/ERC20.json');

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

const configFileFolder = `${__dirname}/config`;

const registryAddress = getConfig('registry_address', false) as
    | string
    | undefined;

// mainnet registry contract is in avalanche chain
// ropsten registry contract is in ropsten chain
const ethererumProvider = getAlchemyRpcProvider();
let provider;
if (process.env.NODE_ENV === 'mainnet') {
    // provider = getAvaxFullNodeRpcProvider();
    provider = new ethers.providers.JsonRpcProvider(
        'https://api.avax.network/ext/bc/C/rpc'
    );
} else {
    provider = ethererumProvider;
}

let registry;
if (registryAddress) {
    registry = new ethers.Contract(registryAddress, registryABI, provider);
}
const activeContractNames = [];
let localContractConfig;

const ContractNames = {
    groVault: 'GroVault',
    powerD: 'PowerDollar',
    depositHandler: 'DepositHandler',
    withdrawHandler: 'WithdrawHandler',
    emergencyHandler: 'EmergencyHandler',
    controller: 'Controller',
    pnl: 'PnL',
    insurance: 'Insurance',
    exposure: 'Exposure',
    allocation: 'Allocation',
    buoy3Pool: 'Buoy3Pool',
    lifeguard: 'Lifeguard',
    DAIVault: 'DAIVault',
    DAIVaultAdaptor: 'DAIVaultAdaptor',
    DAIPrimary: 'DAIPrimary',
    DAISecondary: 'DAISecondary',
    USDCVault: 'USDCVault',
    USDCVaultAdaptor: 'USDCVaultAdaptor',
    USDCPrimary: 'USDCPrimary',
    USDCSecondary: 'USDCSecondary',
    USDTVault: 'USDTVault',
    USDTVaultAdaptor: 'USDTVaultAdaptor',
    USDTPrimary: 'USDTPrimary',
    USDTSecondary: 'USDTSecondary',
    // CRVVault: '3CRVVault',
    // CRVVaultAdaptor: '3CRVVaultAdaptor',
    // CRVPrimary: '3CrvPrimary',
    BalancerWeightedPool: 'BalancerWeightedPool',
    TokenCounter: 'TokenCounter',
    GroHodler: 'GroHodler',
    GroHodlerV1: 'GroHodlerV1',
    GroHodlerV2: 'GroHodlerV2',
    LPTokenStakerV1: 'LPTokenStakerV1',
    LPTokenStakerV2: 'LPTokenStakerV2',
    GroDAOVesting: 'GroDAOVesting',
    GroVesting: 'GroVesting',
    GroVestingV1_IDL: 'GroVestingV1_IDL',
    GroVestingV2_IDL: 'GroVestingV2_IDL',
    GroDAOToken: 'GroDAOToken',
    VotingAggregator: 'VotingAggregator',
    AVAXDAIVault: 'AVAXDAIVault',
    AVAXUSDCVault: 'AVAXUSDCVault',
    AVAXUSDTVault: 'AVAXUSDTVault',
    AVAXDAIVault_v1_5: 'AVAXDAIVault_v1_5',
    AVAXUSDCVault_v1_5: 'AVAXUSDCVault_v1_5',
    AVAXUSDTVault_v1_5: 'AVAXUSDTVault_v1_5',
    AVAXDAIVault_v1_6: 'AVAXDAIVault_v1_6',
    AVAXUSDCVault_v1_6: 'AVAXUSDCVault_v1_6',
    AVAXUSDTVault_v1_6: 'AVAXUSDTVault_v1_6',
    AVAXDAIVault_v1_7: 'AVAXDAIVault_v1_7',
    AVAXUSDCVault_v1_7: 'AVAXUSDCVault_v1_7',
    AVAXUSDTVault_v1_7: 'AVAXUSDTVault_v1_7',
    AVAXDAIStrategy: 'AVAXDAIStrategy',
    AVAXUSDCStrategy: 'AVAXUSDCStrategy',
    AVAXUSDTStrategy: 'AVAXUSDTStrategy',
    AVAXDAIStrategy_v1_5: 'AVAXDAIStrategy_v1_5',
    AVAXUSDCStrategy_v1_5: 'AVAXUSDCStrategy_v1_5',
    AVAXUSDTStrategy_v1_5: 'AVAXUSDTStrategy_v1_5',
    AVAXDAIStrategy_v1_6: 'AVAXDAIStrategy_v1_6',
    AVAXUSDCStrategy_v1_6: 'AVAXUSDCStrategy_v1_6',
    AVAXUSDTStrategy_v1_6: 'AVAXUSDTStrategy_v1_6',
    AVAXDAIStrategy_v1_7: 'AVAXDAIStrategy_v1_7',
    AVAXUSDCStrategy_v1_7: 'AVAXUSDCStrategy_v1_7',
    AVAXUSDCStrategy_v1_7_v1: 'AVAXUSDCStrategy_v1_7_v1',
    AVAXUSDCStrategy_v1_7_v2: 'AVAXUSDCStrategy_v1_7_v2',
    AVAXUSDTStrategy_v1_7: 'AVAXUSDTStrategy_v1_7',
    AVAXUSDTStrategy_v1_7_v1: 'AVAXUSDTStrategy_v1_7_v1',
    AVAXUSDTStrategy_v1_7_v2: 'AVAXUSDTStrategy_v1_7_v2',
    AVAXDAIStrategy_v1_9_internal: "AVAXDAIStrategy_v1_9_internal",
    AVAXUSDCStrategy_v1_9_internal: "AVAXUSDCStrategy_v1_9_internal",
    AVAXUSDTStrategy_v1_9_internal: "AVAXUSDTStrategy_v1_9_internal",
    AVAXBouncer: 'AVAXBouncer',
    Chainlink_aggr_usdc_e: 'Chainlink_aggr_usdc_e',
    Chainlink_aggr_usdt_e: 'Chainlink_aggr_usdt_e',
    Chainlink_aggr_dai_e: 'Chainlink_aggr_dai_e',
    Chainlink_aggr_usdc: 'Chainlink_aggr_usdc',
    Chainlink_aggr_usdt: 'Chainlink_aggr_usdt',
    Chainlink_aggr_dai: 'Chainlink_aggr_dai',
    DAI_e: "DAI_e",
    USDC_e: "USDC_e",
    USDT_e: "USDT_e",
    AVAXDAIVault_v1_9_internal: "AVAXDAIVault_v1_9_internal",
    AVAXUSDCVault_v1_9_internal: "AVAXUSDCVault_v1_9_internal",
    AVAXUSDTVault_v1_9_internal: "AVAXUSDTVault_v1_9_internal",
    DAI: "DAI",
    USDC: "USDC",
    USDT: "USDT",
    UniswapV2Pair_gvt_gro: "UniswapV2Pair_gvt_gro",
    UniswapV2Pair_gro_usdc: "UniswapV2Pair_gro_usdc",
    BalancerV2Vault: "BalancerV2Vault",
    Balancer_gro_weth_LP: "Balancer_gro_weth_LP",
    Curve_PWRD3CRV: "Curve_PWRD3CRV",
    Curve_3CRV: "Curve_3CRV",
    Airdrop: "Airdrop",
    GMerkleVestor: "GMerkleVestor",
};

const ContractABIMapping = {};
ContractABIMapping[ContractNames.groVault] = 'NonRebasingGToken';
ContractABIMapping[ContractNames.powerD] = 'RebasingGToken';
ContractABIMapping[ContractNames.depositHandler] = 'DepositHandler';
ContractABIMapping[ContractNames.withdrawHandler] = 'WithdrawHandler';
ContractABIMapping[ContractNames.emergencyHandler] = 'EmergencyHandler';
ContractABIMapping[ContractNames.controller] = 'Controller';
ContractABIMapping[ContractNames.pnl] = 'PnL';
ContractABIMapping[ContractNames.insurance] = 'Insurance';
ContractABIMapping[ContractNames.exposure] = 'Exposure';
ContractABIMapping[ContractNames.allocation] = 'Allocation';
ContractABIMapping[ContractNames.buoy3Pool] = 'Buoy3Pool';
ContractABIMapping[ContractNames.lifeguard] = 'LifeGuard3Pool';
ContractABIMapping[ContractNames.DAIVault] = 'Vault';
ContractABIMapping[ContractNames.DAIVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.DAIPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.DAISecondary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDCVault] = 'Vault';
ContractABIMapping[ContractNames.USDCVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.USDCPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDCSecondary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDTVault] = 'Vault';
ContractABIMapping[ContractNames.USDTVaultAdaptor] = 'VaultAdaptorYearnV2_032';
ContractABIMapping[ContractNames.USDTPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.USDTSecondary] = 'BaseStrategy';
// ContractABIMapping[ContractNames.CRVVault] = 'Vault';
// ContractABIMapping[ContractNames.CRVVaultAdaptor] = 'VaultAdaptorYearnV2_032';
// ContractABIMapping[ContractNames.CRVPrimary] = 'BaseStrategy';
ContractABIMapping[ContractNames.BalancerWeightedPool] = 'BalancerWeightedPool';
ContractABIMapping[ContractNames.TokenCounter] = 'TokenCounter';
ContractABIMapping[ContractNames.GroHodler] = 'GroHodler';
ContractABIMapping[ContractNames.GroHodlerV1] = 'GroHodlerV1';
ContractABIMapping[ContractNames.GroHodlerV2] = 'GroHodlerV2';
ContractABIMapping[ContractNames.GroDAOVesting] = 'GroDAOVesting';
ContractABIMapping[ContractNames.LPTokenStakerV1] = 'LPTokenStakerV1';
ContractABIMapping[ContractNames.LPTokenStakerV2] = 'LPTokenStaker';
ContractABIMapping[ContractNames.GroVesting] = 'GroVesting';
ContractABIMapping[ContractNames.GroVestingV1_IDL] = 'GroVesting';
ContractABIMapping[ContractNames.GroVestingV2_IDL] = 'GroVesting';
ContractABIMapping[ContractNames.GroDAOToken] = 'GroDAOToken';
ContractABIMapping[ContractNames.VotingAggregator] = 'VoteAggregator';
ContractABIMapping[ContractNames.AVAXDAIVault] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXDAIVault_v1_5] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault_v1_5] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault_v1_5] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXDAIStrategy] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDCStrategy] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXDAIVault_v1_5] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault_v1_5] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault_v1_5] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXDAIVault_v1_6] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault_v1_6] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault_v1_6] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXDAIVault_v1_7] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault_v1_7] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault_v1_7] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXDAIVault_v1_9_internal] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDCVault_v1_9_internal] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXUSDTVault_v1_9_internal] = 'VaultAdaptorMK2';
ContractABIMapping[ContractNames.AVAXDAIStrategy_v1_5] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDCStrategy_v1_5] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy_v1_5] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXDAIStrategy_v1_6] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDCStrategy_v1_6] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy_v1_6] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXDAIStrategy_v1_7] = 'AHv2FarmerDai';
ContractABIMapping[ContractNames.AVAXUSDCStrategy_v1_7] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDCStrategy_v1_7_v1] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDCStrategy_v1_7_v2] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy_v1_7] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy_v1_7_v1] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy_v1_7_v2] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXDAIStrategy_v1_9_internal] = 'AHv2FarmerDai';
ContractABIMapping[ContractNames.AVAXUSDCStrategy_v1_9_internal] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXUSDTStrategy_v1_9_internal] = 'AHv2Farmer';
ContractABIMapping[ContractNames.AVAXBouncer] = 'Bouncer';
ContractABIMapping[ContractNames.Chainlink_aggr_usdc_e] = 'ChainlinkOffchainAggregatorAvax';
ContractABIMapping[ContractNames.Chainlink_aggr_usdt_e] = 'ChainlinkOffchainAggregatorAvax';
ContractABIMapping[ContractNames.Chainlink_aggr_dai_e] = 'ChainlinkOffchainAggregatorAvax';
ContractABIMapping[ContractNames.Chainlink_aggr_usdc] = 'ChainlinkOffchainAggregatorEth';
ContractABIMapping[ContractNames.Chainlink_aggr_usdt] = 'ChainlinkOffchainAggregatorEth';
ContractABIMapping[ContractNames.Chainlink_aggr_dai] = 'ChainlinkOffchainAggregatorEth';
ContractABIMapping[ContractNames.DAI_e] = 'DAI_e';
ContractABIMapping[ContractNames.USDC_e] = 'USDC_e';
ContractABIMapping[ContractNames.USDT_e] = 'USDT_e';
ContractABIMapping[ContractNames.DAI] = 'DAI';
ContractABIMapping[ContractNames.USDC] = 'USDC';
ContractABIMapping[ContractNames.USDT] = 'USDT';
ContractABIMapping[ContractNames.UniswapV2Pair_gvt_gro] = 'UniswapV2Pair_gvt_gro';
ContractABIMapping[ContractNames.UniswapV2Pair_gro_usdc] = 'UniswapV2Pair_gro_usdc';
ContractABIMapping[ContractNames.BalancerV2Vault] = 'BalancerV2Vault';
ContractABIMapping[ContractNames.Balancer_gro_weth_LP] = 'Balancer_gro_weth_LP';
ContractABIMapping[ContractNames.Curve_PWRD3CRV] = 'Curve_PWRD3CRV';
ContractABIMapping[ContractNames.Curve_3CRV] = 'Curve_3CRV';
ContractABIMapping[ContractNames.Airdrop] = 'Airdrop';
ContractABIMapping[ContractNames.GMerkleVestor] = 'GMerkleVestor';

function readLocalContractConfig(isReload = false) {
    if (isReload || !localContractConfig) {
        const filePath = `${configFileFolder}/${process.env.NODE_ENV}_contractConfig.json`;
        const data = fs.readFileSync(filePath, { flag: 'a+' });
        let content = data.toString();
        if (content.length === 0) {
            content = '{}';
        }
        localContractConfig = JSON.parse(content);
        logger.info(
            `Load config file from : ${filePath}:\n${JSON.stringify(
                localContractConfig
            )}`
        );
    }
    return localContractConfig;
}

async function getActiveContractNames() {
    if (!activeContractNames.length) {
        const localConfig = readLocalContractConfig();
        if (localConfig.contractNames) {
            activeContractNames.push(...localConfig.contractNames);
        } else {
            const result = await registry.getKeys().catch((error) => {
                logger.error(error);
                return [];
            });

            for (let i = 0; i < result.length; i += 1) {
                if (result[i] !== '') {
                    activeContractNames.push(result[i]);
                }
            }
        }
    }

    return activeContractNames;
}

async function parseProtocolExposure(protocols, metaData) {
    const protocolsDisplayName = [];
    const protocolsName = [];
    for (let i = 0; i < protocols.length; i += 1) {
        const protocolIndex = parseInt(`${protocols[i]}`, 10);
        // eslint-disable-next-line no-await-in-loop
        const protocolName = await registry
            .getProtocol(protocols[i])
            .catch((error) => {
                logger.error(error);
                return '';
            });
        protocolsName.push(protocolName);
        if (metaData.PDN && metaData.PDN[protocolIndex]) {
            protocolsDisplayName.push(metaData.PDN[protocolIndex]);
        } else {
            protocolsDisplayName.push(protocolName);
        }
    }
    return { protocolsDisplayName, protocolsName };
}

async function parseTokenExposure(tag, tokens) {
    const result = [];

    for (let i = 0; i < tokens.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const tokenAddress = await registry
            .getToken(tokens[i])
            .catch((error) => {
                logger.error(error);
            });
        let tokenSymbol = '';
        if (tag === 'AVAX') {
            tokenSymbol = tokenAddress;
        } else {
            if (tokenAddress) {
                const token = new ethers.Contract(
                    tokenAddress,
                    erc20ABI,
                    ethererumProvider
                );
                // eslint-disable-next-line no-await-in-loop
                tokenSymbol = await token.symbol().catch((error) => {
                    logger.error(error);
                    return '';
                });
            }
        }

        result.push(tokenSymbol);
    }

    return result;
}

async function getActiveContractInfoByName(contractName) {
    const localConfig = readLocalContractConfig();
    let result = {};
    if (
        localConfig.contractHistories &&
        localConfig.contractHistories[contractName]
    ) {
        const contracts = localConfig.contractHistories[contractName];
        result = contracts[contracts.length - 1];
    } else {
        const contractAddress = await registry
            .getActive(contractName)
            .catch((error) => {
                throw error;
            });
        const contractInfo = await registry
            .getActiveData(contractName)
            .catch((error) => {
                throw error;
            });

        const latestStartBlock =
            contractInfo.startBlock[contractInfo.startBlock.length - 1];
        const metaData = contractInfo.metaData.trim().length
            ? contractInfo.metaData
            : '{}';
        const metaDataObject = JSON.parse(metaData);
        const protocolInfo = await parseProtocolExposure(
            contractInfo.protocols,
            metaDataObject
        );
        const tokenNames = await parseTokenExposure(
            contractInfo.tag,
            contractInfo.tokens
        );
        result = {
            address: contractAddress,
            deployedBlock: parseInt(`${contractInfo.deployedBlock}`, 10),
            startBlock: parseInt(`${latestStartBlock}`, 10),
            abiVersion: contractInfo.abiVersion,
            tag: contractInfo.tag,
            tokens: tokenNames,
            protocols: protocolInfo.protocolsName,
            protocolsDisplayName: protocolInfo.protocolsDisplayName,
            metaData: metaDataObject,
            active: contractInfo.active,
        };
    }
    return result;
}

async function getContracts(contractName) {
    const addresses = await registry
        .getContractMap(contractName)
        .catch((error) => {
            logger.error(error);
            return [];
        });
    return addresses;
}

async function getContractInfoByAddress(address) {
    const localConfig = readLocalContractConfig();
    const result = [];
    if (localConfig.contractInfo && localConfig.contractInfo[address]) {
        result.push(...localConfig.contractInfo[address]);
    } else {
        const info = await registry.getContractData(address).catch((error) => {
            logger.error(error);
            return {};
        });
        const metaData = info.metaData.trim().length ? info.metaData : '{}';
        const metaDataObject = JSON.parse(metaData);
        const protocolInfo = await parseProtocolExposure(
            info.protocols,
            metaDataObject
        );
        const tokenNames = await parseTokenExposure(info.tag, info.tokens);
        if (info.startBlock) {
            for (let i = 0; i < info.startBlock.length; i += 1) {
                result.push({
                    address,
                    deployedBlock: parseInt(`${info.deployedBlock}`, 10),
                    startBlock: parseInt(`${info.startBlock[i]}`, 10),
                    endBlock: parseInt(`${info.endBlock[i]}`, 10),
                    abiVersion: info.abiVersion,
                    tag: info.tag,
                    tokens: tokenNames,
                    protocols: protocolInfo.protocolsName,
                    protocolsDisplayName: protocolInfo.protocolsDisplayName,
                    metaData: metaDataObject,
                    active: info.active,
                });
            }
        }
    }
    return result;
}

async function getContractHistory(contractName) {
    const localConfig = readLocalContractConfig();
    let contractHistory = [];
    if (
        localConfig.contractHistories &&
        localConfig.contractHistories[contractName]
    ) {
        contractHistory = localConfig.contractHistories[contractName];
    } else {
        const contracts = await getContracts(contractName);
        const resultPromise = [];
        for (let i = 0; i < contracts.length; i += 1) {
            resultPromise.push(getContractInfoByAddress(contracts[i]));
        }
        const result = await Promise.all(resultPromise);
        for (let i = 0; i < result.length; i += 1) {
            contractHistory.push(...result[i]);
        }
    }
    return contractHistory;
}

async function getLatestContracts(isByAddress = false) {
    const contractNames = await getActiveContractNames();
    const resultPromise = [];
    for (let i = 0; i < contractNames.length; i += 1) {
        resultPromise.push(getActiveContractInfoByName(contractNames[i]));
    }
    const result = await Promise.all(resultPromise);
    const contracts = {};
    for (let i = 0; i < contractNames.length; i += 1) {
        if (isByAddress) {
            result[i].contractName = contractNames[i];
            contracts[result[i].address] = result[i];
        } else {
            contracts[contractNames[i]] = result[i];
        }
    }
    return contracts;
}

async function getContractsHistory() {
    const contractNames = await getActiveContractNames();
    logger.info(`contractNames: ${JSON.stringify(contractNames)}`);
    const resultPromise = [];
    for (let i = 0; i < contractNames.length; i += 1) {
        resultPromise.push(getContractHistory(contractNames[i]));
    }
    const result = await Promise.all(resultPromise);
    const contractsHistory = {};
    for (let i = 0; i < contractNames.length; i += 1) {
        contractsHistory[contractNames[i]] = result[i];
    }

    return contractsHistory;
}

export {
    ContractNames,
    ContractABIMapping,
    readLocalContractConfig,
    getLatestContracts,
    getContractHistory,
    getContractsHistory,
};
