import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js'
import { getAlchemyRpcProvider } from './chainUtil';
import { getLatestContractsAddress } from '../registry/registryLoader';
import { ContractNames } from '../registry/registry';
import BlockChainCallError from './error/BlockChainCallError';
import { MESSAGE_TYPES } from './discord/discordService';
import { adjustDecimal, toSum } from './digitalUtil';
import { getVaultStableCoins, getInsurance, getExposure } from '../contract/allContracts';
import { JsonFragment } from '@ethersproject/abi';
const pnlABI = require('../contract/abis/PnL.json');
const vaultABI = require('../contract/abis/Vault.json');
const erc20ABI = require('../contract/abis/ERC20.json');

const botEnv = process.env.BOT_ENV?.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../${botEnv}/${botEnv}Logger`);

function parseData(abi: string | readonly (string | ethers.utils.Fragment | JsonFragment)[], fragment: string | ethers.utils.EventFragment, dataContent: ethers.utils.BytesLike): ethers.utils.Result {
    const iface = new ethers.utils.Interface(abi);
    const result = iface.decodeEventLog(fragment, dataContent);
    return result;
}

function getEventFragment(abi: string | readonly (string | ethers.utils.Fragment | JsonFragment)[], eventName: string): { eventFragment: ethers.utils.EventFragment; topic: string; } | undefined {
    let result: { eventFragment: ethers.utils.EventFragment; topic: string; };
    const iface = new ethers.utils.Interface(abi);
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

async function pretreatReceipt(
    messageType: string,
    transactionHash: string,
    transactionReceipt: any,
    providerKey: string
): Promise<any> {
    if (!transactionReceipt) {
        const provider = getAlchemyRpcProvider(providerKey);
        transactionReceipt = await provider
            .getTransactionReceipt(transactionHash)
            .catch((error: any) => {
                logger.error(error);
                throw new BlockChainCallError(
                    `Get transaction receipt by hash: ${transactionHash}`,
                    messageType
                );
            });
    }
    return transactionReceipt;
}

async function getPnlKeyData(transactionHash: string, transactionReceipt: any, providerKey: string): Promise<ethers.utils.Result> {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.pnl,
        transactionHash,
        transactionReceipt,
        providerKey
    );
    let result: ethers.utils.Result = [];
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(pnlABI, 'LogPnLExecution');
        if (eventFragment) {
            logger.info(`Pnl topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, data } = logs[i];
                if (eventFragment.topic === topics[0]) {
                    result = parseData(
                        pnlABI,
                        eventFragment.eventFragment,
                        data
                    );
                    break;
                }
            }
        }
    }
    return result;
}

function handleCoinAmount(address: string, value: any): BigNumber {
    const decimals = getVaultStableCoins().decimals[address];
    return adjustDecimal(value, decimals);
}
async function getInvestKeyData(
    transactionHash: string,
    stableCoins: string | any[],
    transactionReceipt: any,
    providerKey: string
): Promise<BigNumber> {
    logger.info(`stable coins: ${JSON.stringify(stableCoins)}`);
    const tempResult = {};
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.invest,
        transactionHash,
        transactionReceipt,
        providerKey
    );
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            // logger.info(`Transfer topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (
                    eventFragment.topic === topics[0] &&
                    stableCoins.includes(address)
                ) {
                    tempResult[address] = parseData(
                        erc20ABI,
                        eventFragment.eventFragment,
                        data
                    );
                }
            }
        }
    }
    // handle amount to display
    const coinAddresses = Object.keys(tempResult);
    const eachItem: any = [];
    for (let i = 0; i < coinAddresses.length; i += 1) {
        const coinAddress = coinAddresses[i];
        eachItem.push(
            handleCoinAmount(coinAddress, tempResult[coinAddress][2])
        );
    }
    return toSum(eachItem);
}

async function getHarvestKeyData(
    transactionHash: string,
    transactionReceipt: any,
    providerKey: string
): Promise<ethers.utils.Result> {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.harvest,
        transactionHash,
        transactionReceipt,
        providerKey
    );
    let result: ethers.utils.Result = [];
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(vaultABI, 'StrategyReported');
        if (eventFragment) {
            logger.info(`Strategy Report topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, data } = logs[i];
                if (eventFragment.topic === topics[0]) {
                    result = parseData(
                        vaultABI,
                        eventFragment.eventFragment,
                        data
                    );
                    break;
                }
            }
        }
    }
    return result;
}

async function getRebalanceKeyData(
    transactionHash: string,
    transactionReceipt: any,
    providerKey: string
): Promise<{stablecoinExposure: any[]}> {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.harvest,
        transactionHash,
        transactionReceipt,
        providerKey
    );

    if (transactionReceipt) {
        const { blockNumber } = transactionReceipt;
        const systemState = await getInsurance(providerKey)
            .prepareCalculation({ blockTag: blockNumber })
            .catch((error) => {
                logger.error(error);
                throw new BlockChainCallError(
                    "Get system's state failed",
                    MESSAGE_TYPES.rebalance
                );
            });
        const exposureState = await getExposure(providerKey)
            .calcRiskExposure(systemState, { blockTag: blockNumber })
            .catch((error) => {
                logger.error(error);
                throw new BlockChainCallError(
                    "Get system's exposure state failed",
                    MESSAGE_TYPES.rebalance
                );
            });
        return { stablecoinExposure: exposureState[0] };
    }
    return { stablecoinExposure: [] };
}

async function getMintOrBurnGToken(
    isPWRD: any,
    transactionHash: string,
    transactionReceipt: any,
    providerKey: string
): Promise<number | string> {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.miniStatsPersonal,
        transactionHash,
        transactionReceipt,
        providerKey
    );
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        let gtoken =
            getLatestContractsAddress()[
                ContractNames.powerD
            ].address.toLowerCase();
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            // logger.info(`Transfer topic: ${eventFragment.topic}`);
            if (!isPWRD) {
                gtoken =
                    getLatestContractsAddress()[
                        ContractNames.groVault
                    ].address.toLowerCase();
            }
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (
                    eventFragment.topic === topics[0] &&
                    gtoken === address.toLowerCase()
                ) {
                    const logData = parseData(
                        erc20ABI,
                        eventFragment.eventFragment,
                        data
                    );
                    return logData[2].toString();
                }
            }
        }
    }
    return 0;
}

export {
    getPnlKeyData,
    getInvestKeyData,
    getHarvestKeyData,
    getRebalanceKeyData,
    getMintOrBurnGToken,
};
