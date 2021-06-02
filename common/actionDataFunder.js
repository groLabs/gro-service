const { ethers } = require('ethers');
const { getRpcProvider } = require('./chainUtil');
const { BlockChainCallError } = require('./error');
const { MESSAGE_TYPES } = require('./discord/discordService');
const { adjustDecimal, toSum } = require('./digitalUtil');
const {
    getVaultStabeCoins,
    getInsurance,
    getExposure,
    getPwrd,
    getGvt,
} = require('../contract/allContracts');
const pnlABI = require('../contract/abis/PnL.json');
const vaultABI = require('../contract/abis/Vault.json');
const erc20ABI = require('../contract/abis/ERC20.json');

const botEnv = process.env.BOT_ENV.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../${botEnv}/${botEnv}Logger`);

function parseData(abi, fragment, dataContent) {
    const iface = new ethers.utils.Interface(abi);
    const result = iface.decodeEventLog(fragment, dataContent);
    return result;
}

function getEventFragment(abi, eventName) {
    let result;
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
    messageType,
    transactionHash,
    transactionReceipt
) {
    if (!transactionReceipt) {
        transactionReceipt = await getRpcProvider()
            .getTransactionReceipt(transactionHash)
            .catch((error) => {
                logger.error(error);
                throw new BlockChainCallError(
                    `Get transaction receipt by hash: ${transactionHash}`,
                    messageType
                );
            });
    }
    return transactionReceipt;
}

async function getPnlKeyData(transactionHash, transactionReceipt) {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.pnl,
        transactionHash,
        transactionReceipt
    );
    let result = [];
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

function handleCoinAmount(address, value) {
    const decimals = getVaultStabeCoins().decimals[address];
    return adjustDecimal(value, decimals);
}
async function getInvestKeyData(
    transactionHash,
    stabeCoins,
    transactionReceipt
) {
    logger.info(`stabe coins: ${JSON.stringify(stabeCoins)}`);
    const tempResult = {};
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.invest,
        transactionHash,
        transactionReceipt
    );
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            logger.info(`Transfer topic: ${eventFragment.topic}`);
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (
                    eventFragment.topic === topics[0] &&
                    stabeCoins.includes(address)
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
    const eachItem = [];
    for (let i = 0; i < coinAddresses.length; i += 1) {
        const coinAddress = coinAddresses[i];
        eachItem.push(
            handleCoinAmount(coinAddress, tempResult[coinAddress][2])
        );
    }
    return toSum(eachItem);
}

async function getHarvestKeyData(transactionHash, transactionReceipt) {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.harvest,
        transactionHash,
        transactionReceipt
    );
    let result = [];
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

async function getRebalanceKeyData(transactionHash, transactionReceipt) {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.harvest,
        transactionHash,
        transactionReceipt
    );

    if (transactionReceipt) {
        const { blockNumber } = transactionReceipt;
        const systemState = await getInsurance()
            .prepareCalculation({ blockTag: blockNumber })
            .catch((error) => {
                logger.error(error);
                throw new BlockChainCallError(
                    "Get system's state failed",
                    MESSAGE_TYPES.rebalance
                );
            });
        const exposureState = await getExposure()
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
    isPWRD,
    transactionHash,
    transactionReceipt
) {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.miniStatsPersonal,
        transactionHash,
        transactionReceipt
    );
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        let gtoken = getPwrd().address;
        const eventFragment = getEventFragment(erc20ABI, 'Transfer');
        if (eventFragment) {
            logger.info(`Transfer topic: ${eventFragment.topic}`);
            if (!isPWRD) {
                gtoken = getGvt().address;
            }
            for (let i = 0; i < logs.length; i += 1) {
                const { topics, address, data } = logs[i];
                if (eventFragment.topic === topics[0] && gtoken === address) {
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

module.exports = {
    getPnlKeyData,
    getInvestKeyData,
    getHarvestKeyData,
    getRebalanceKeyData,
    getMintOrBurnGToken,
};
