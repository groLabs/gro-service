"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMintOrBurnGToken = exports.getRebalanceKeyData = exports.getHarvestKeyData = exports.getInvestKeyData = exports.getPnlKeyData = void 0;
const ethers_1 = require("ethers");
const chainUtil_1 = require("./chainUtil");
const registryLoader_1 = require("../registry/registryLoader");
const registry_1 = require("../registry/registry");
const BlockChainCallError_1 = __importDefault(require("./error/BlockChainCallError"));
const discordService_1 = require("./discord/discordService");
const digitalUtil_1 = require("./digitalUtil");
const { getVaultStableCoins, getInsurance, getExposure, getPwrd, getGvt, } = require('../contract/allContracts');
const pnlABI = require('../contract/abis/PnL.json');
const vaultABI = require('../contract/abis/Vault.json');
const erc20ABI = require('../contract/abis/ERC20.json');
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../${botEnv}/${botEnv}Logger`);
function parseData(abi, fragment, dataContent) {
    const iface = new ethers_1.ethers.utils.Interface(abi);
    const result = iface.decodeEventLog(fragment, dataContent);
    return result;
}
function getEventFragment(abi, eventName) {
    let result;
    const iface = new ethers_1.ethers.utils.Interface(abi);
    const eventFragments = Object.values(iface.events);
    for (let i = 0; i < eventFragments.length; i += 1) {
        const eventFragment = eventFragments[i];
        if (eventFragment.name === eventName) {
            result = {
                eventFragment,
                topic: iface.getEventTopic(eventFragment),
            };
            break;
        }
    }
    return result;
}
async function pretreatReceipt(messageType, transactionHash, transactionReceipt, providerKey) {
    if (!transactionReceipt) {
        const provider = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
        transactionReceipt = await provider
            .getTransactionReceipt(transactionHash)
            .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError_1.default(`Get transaction receipt by hash: ${transactionHash}`, messageType);
        });
    }
    return transactionReceipt;
}
async function getPnlKeyData(transactionHash, transactionReceipt, providerKey) {
    transactionReceipt = await pretreatReceipt(discordService_1.MESSAGE_TYPES.pnl, transactionHash, transactionReceipt, providerKey);
    let result = [];
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(pnlABI, 'LogPnLExecution');
        if (eventFragment) {
            logger.info(`Pnl topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, data } = logs[i];
                if (eventFragment.topic === topics[0]) {
                    result = parseData(pnlABI, eventFragment.eventFragment, data);
                    break;
                }
            }
        }
    }
    return result;
}
exports.getPnlKeyData = getPnlKeyData;
function handleCoinAmount(address, value) {
    const decimals = getVaultStableCoins().decimals[address];
    return (0, digitalUtil_1.adjustDecimal)(value, decimals);
}
async function getInvestKeyData(transactionHash, stableCoins, transactionReceipt, providerKey) {
    logger.info(`stable coins: ${JSON.stringify(stableCoins)}`);
    const tempResult = {};
    transactionReceipt = await pretreatReceipt(discordService_1.MESSAGE_TYPES.invest, transactionHash, transactionReceipt, providerKey);
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            // logger.info(`Transfer topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (eventFragment.topic === topics[0] &&
                    stableCoins.includes(address)) {
                    tempResult[address] = parseData(erc20ABI, eventFragment.eventFragment, data);
                }
            }
        }
    }
    // handle amount to display
    const coinAddresses = Object.keys(tempResult);
    const eachItem = [];
    for (let i = 0; i < coinAddresses.length; i += 1) {
        const coinAddress = coinAddresses[i];
        eachItem.push(handleCoinAmount(coinAddress, tempResult[coinAddress][2]));
    }
    return (0, digitalUtil_1.toSum)(eachItem);
}
exports.getInvestKeyData = getInvestKeyData;
async function getHarvestKeyData(transactionHash, transactionReceipt, providerKey) {
    transactionReceipt = await pretreatReceipt(discordService_1.MESSAGE_TYPES.harvest, transactionHash, transactionReceipt, providerKey);
    let result = [];
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(vaultABI, 'StrategyReported');
        if (eventFragment) {
            logger.info(`Strategy Report topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, data } = logs[i];
                if (eventFragment.topic === topics[0]) {
                    result = parseData(vaultABI, eventFragment.eventFragment, data);
                    break;
                }
            }
        }
    }
    return result;
}
exports.getHarvestKeyData = getHarvestKeyData;
async function getRebalanceKeyData(transactionHash, transactionReceipt, providerKey) {
    transactionReceipt = await pretreatReceipt(discordService_1.MESSAGE_TYPES.harvest, transactionHash, transactionReceipt, providerKey);
    if (transactionReceipt) {
        const { blockNumber } = transactionReceipt;
        const systemState = await getInsurance(providerKey)
            .prepareCalculation({ blockTag: blockNumber })
            .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError_1.default("Get system's state failed", discordService_1.MESSAGE_TYPES.rebalance);
        });
        const exposureState = await getExposure(providerKey)
            .calcRiskExposure(systemState, { blockTag: blockNumber })
            .catch((error) => {
            logger.error(error);
            throw new BlockChainCallError_1.default("Get system's exposure state failed", discordService_1.MESSAGE_TYPES.rebalance);
        });
        return { stablecoinExposure: exposureState[0] };
    }
    return { stablecoinExposure: [] };
}
exports.getRebalanceKeyData = getRebalanceKeyData;
async function getMintOrBurnGToken(isPWRD, transactionHash, transactionReceipt, providerKey) {
    transactionReceipt = await pretreatReceipt(discordService_1.MESSAGE_TYPES.miniStatsPersonal, transactionHash, transactionReceipt, providerKey);
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        let gtoken = (0, registryLoader_1.getLatestContractsAddress)()[registry_1.ContractNames.powerD].address.toLowerCase();
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            // logger.info(`Transfer topic: ${eventFragment.topic}`);
            if (!isPWRD) {
                gtoken =
                    (0, registryLoader_1.getLatestContractsAddress)()[registry_1.ContractNames.groVault].address.toLowerCase();
            }
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (eventFragment.topic === topics[0] &&
                    gtoken === address.toLowerCase()) {
                    const logData = parseData(erc20ABI, eventFragment.eventFragment, data);
                    return logData[2].toString();
                }
            }
        }
    }
    return 0;
}
exports.getMintOrBurnGToken = getMintOrBurnGToken;