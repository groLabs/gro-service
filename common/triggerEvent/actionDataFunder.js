const { ethers } = require('ethers');
const { getRpcProvider } = require('../chainUtil');
const { BlockChainCallError } = require('../error');
const { MESSAGE_TYPES } = require('../discord/discordService');
const { pnlABI, stableCoinABI, reportABI } = require('./eventAbi');
const { adjustDecimal, toSum } = require('../digitalUtil');
const {
    getVaultStabeCoins,
    getInsurance,
    getExposure,
} = require('../../contract/allContracts');

const botEnv = process.env.BOT_ENV.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../../${botEnv}/${botEnv}Logger`);

function getEventTopic(event) {
    const iface = new ethers.utils.Interface(event.abi);
    const eventFragment = iface.events[event.key];
    const topic = iface.getEventTopic(eventFragment);
    return topic;
}

function parseData(dataSignature, dataContent) {
    const result = ethers.utils.defaultAbiCoder.decode(
        dataSignature,
        dataContent
    );
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
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const topic = getEventTopic(pnlABI);
        logger.info(`Pnl topic: ${topic}`);
        for (let i = 0; i < logs.length; i += 1) {
            const { topics, data } = logs[i];
            if (topic === topics[0]) {
                return parseData(pnlABI.dataSignature, data);
            }
        }
    }
    return [];
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
        const topic = getEventTopic(stableCoinABI);
        logger.info(`Transfer topic: ${topic}`);
        for (let i = 0; i < logs.length; i += 1) {
            const { topics, address, data } = logs[i];
            if (topic === topics[0] && stabeCoins.includes(address)) {
                tempResult[address] = parseData(
                    stableCoinABI.dataSignature,
                    data
                );
            }
        }
    }
    // handle amount to display
    const coinAddresses = Object.keys(tempResult);
    const eachItem = [];
    for (let i = 0; i < coinAddresses.length; i += 1) {
        const coinAddress = coinAddresses[i];
        eachItem.push(handleCoinAmount(coinAddress, tempResult[coinAddress]));
    }
    return toSum(eachItem);
}

async function getHarvestKeyData(transactionHash, transactionReceipt) {
    transactionReceipt = await pretreatReceipt(
        MESSAGE_TYPES.harvest,
        transactionHash,
        transactionReceipt
    );
    if (transactionReceipt) {
        const { logs } = transactionReceipt;
        const topic = getEventTopic(reportABI);
        logger.info(`Report topic: ${topic}`);
        for (let i = 0; i < logs.length; i += 1) {
            const { topics, data } = logs[i];
            if (topic === topics[0]) {
                return parseData(reportABI.dataSignature, data);
            }
        }
    }
    return [];
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

module.exports = {
    getPnlKeyData,
    getInvestKeyData,
    getHarvestKeyData,
    getRebalanceKeyData,
};
