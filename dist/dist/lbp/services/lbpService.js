const { ethers } = require('ethers');
const { getConfig } = require('../../common/configUtil');
const { getFilterEvents } = require('../../common/logFilter-new');
const { getAlchemyRpcProvider, getCurrentBlockNumber, } = require('../../common/chainUtil');
const logger = require('../lbpLogger');
const groTokenABI = require('./Token.json');
const poolABI = require('./Pool.json');
const providerKey = 'default';
const provider = getAlchemyRpcProvider(providerKey);
const stableCoinAddress = getConfig('lbp.coin_token');
const groTokenAddress = getConfig('lbp.gro_token');
const bpPoolAddress = getConfig('lbp.bp_pool');
const crpPoolAddress = getConfig('lbp.crp_pool');
const groToken = new ethers.Contract(groTokenAddress, groTokenABI, provider);
const bpPool = new ethers.Contract(bpPoolAddress, poolABI, provider);
const crpPool = new ethers.Contract(crpPoolAddress, poolABI, provider);
function arrayToObject(arr, key) {
    return arr.reduce((obj, item) => {
        obj[item[key]] = item;
        return obj;
    }, {});
}
function groupTransferEvents(transferEvents) {
    const result = {};
    for (let i = 0; i < transferEvents.length; i += 1) {
        const { transactionHash } = transferEvents[i];
        if (!result[transactionHash]) {
            result[transactionHash] = [];
        }
        result[transactionHash].push(transferEvents[i]);
    }
    return result;
}
async function getBlocksTimestamp(blocks) {
    const result = {};
    const blocksPromises = [];
    for (let i = 0; i < blocks.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        blocksPromises.push(provider.getBlock(blocks[i]));
    }
    const promiseResult = await Promise.all(blocksPromises);
    for (let i = 0; i < blocks.length; i += 1) {
        const { number, timestamp } = promiseResult[i];
        result[number] = timestamp;
    }
    return result;
}
async function attachTimestampToObject(targetArrayObject) {
    const blocks = new Set();
    for (let i = 0; i < targetArrayObject.length; i += 1) {
        const { blockNumber } = targetArrayObject[i];
        blocks.add(blockNumber);
    }
    const blockTimestamps = await getBlocksTimestamp(Array.from(blocks));
    const result = [];
    for (let i = 0; i < targetArrayObject.length; i += 1) {
        const { blockNumber } = targetArrayObject[i];
        result.push(Object.assign(Object.assign({}, targetArrayObject[i]), { timestamp: blockTimestamps[blockNumber] }));
    }
    return result;
}
async function getTransferEventsInGro(fromBlock, toBlock) {
    const filter = groToken.filters.Transfer(null, null);
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const originalTransferLogs = await getFilterEvents(filter, groToken.interface, 'default');
    const transferLogs = [];
    for (let i = 0; i < originalTransferLogs.length; i += 1) {
        const { address, blockNumber, transactionHash, name, args } = originalTransferLogs[i];
        transferLogs.push({
            address,
            blockNumber,
            transactionHash,
            name,
            from: args[0],
            to: args[1],
            value: `${args[2]}`,
        });
    }
    return transferLogs;
}
async function getSwapEventsInPool(fromBlock, toBlock) {
    const filter = bpPool.filters.LOG_SWAP(null, null, null);
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const swapLogs = await getFilterEvents(filter, bpPool.interface, 'default');
    return swapLogs;
}
async function getExitEventsInPool(fromBlock, toBlock) {
    const filter = crpPool.filters.LogExit(null, null);
    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    const exitLogs = await getFilterEvents(filter, crpPool.interface, 'default');
    return exitLogs;
}
function getSwapEventCaller(transferEvents, args) {
    const transferEventLength = transferEvents.length;
    const { tokenIn } = args;
    if (tokenIn.toLowerCase() === groTokenAddress.toLowerCase()) {
        return transferEvents[0].from;
    }
    return transferEvents[transferEventLength - 1].to;
}
async function fetchSwapEvents(fromBlock, toBlock) {
    logger.info(`fetch swap events from ${fromBlock} to ${toBlock}`);
    let result = [];
    const swapEvents = await getSwapEventsInPool(fromBlock, toBlock);
    const originalTransferEvents = await getTransferEventsInGro(fromBlock, toBlock);
    const transferGroup = groupTransferEvents(originalTransferEvents);
    for (let i = 0; i < swapEvents.length; i += 1) {
        const { address, blockNumber, name, transactionHash, args } = swapEvents[i];
        const relatedTransferEvents = transferGroup[transactionHash];
        const caller = getSwapEventCaller(relatedTransferEvents, args);
        result.push({
            address,
            blockNumber,
            name,
            transactionHash,
            caller,
            tokenIn: args[1],
            tokenOut: args[2],
            tokenAmountIn: `${args[3]}`,
            tokenAmountOut: `${args[4]}`,
        });
    }
    result = await attachTimestampToObject(result);
    return result;
}
async function fetchExitEvents(fromBlock, toBlock) {
    let result = [];
    const exitEvents = await getExitEventsInPool(fromBlock, toBlock);
    for (let i = 0; i < exitEvents.length; i += 1) {
        const { address, blockNumber, name, transactionHash, args } = exitEvents[i];
        result.push({
            address,
            blockNumber,
            name,
            transactionHash,
            caller: args[0],
            tokenOut: args[1],
            tokenAmountOut: `${args[2]}`,
        });
    }
    result = await attachTimestampToObject(result);
    return result;
}
async function getSpotPriceOfPool(outTokenAddress = groTokenAddress, inTokenAddress = stableCoinAddress, blockNumber = 'latest') {
    logger.info(`fetch spot price at block ${blockNumber}`);
    const blockInfo = await provider.getBlock(blockNumber);
    const { number, timestamp } = blockInfo;
    const result = await bpPool.getSpotPrice(inTokenAddress, outTokenAddress, {
        blockTag: number,
    });
    return {
        timestamp,
        blockNumber: number,
        price: `${result}`,
    };
}
async function getBalanceOfGroInPool(blockNumber = 'latest') {
    logger.info(`fetch balance of Gro token ${blockNumber}`);
    const blockInfo = await provider.getBlock(blockNumber);
    const { number, timestamp } = blockInfo;
    const balance = await bpPool.getBalance(groTokenAddress, {
        blockTag: number,
    });
    return {
        timestamp,
        blockNumber: number,
        balance: `${balance}`,
    };
}
async function balanceOfGro(userAddress) {
    const result = await groToken.balanceOf(userAddress);
    return `${result}`;
}
async function totalSupplyOfGro() {
    const result = await groToken.totalSupply();
    return `${result}`;
}
// Old version with price and events
// async function fetchLBPData(startBlockNumber, endBlockNumber) {
//     let currentBlockNumber = endBlockNumber;
//     if (!currentBlockNumber) {
//         currentBlockNumber = await getCurrentBlockNumber(providerKey);
//     }
//     const spotPrice = await getSpotPriceOfPool(
//         groTokenAddress,
//         stableCoinAddress,
//         currentBlockNumber
//     );
//     const swapEvents = await fetchSwapEvents(
//         startBlockNumber,
//         currentBlockNumber
//     );
//     return {
//         price: spotPrice,
//         trades: swapEvents,
//     };
// }
// New version with price and token supply
async function fetchLBPData(endBlockNumber) {
    let currentBlockNumber = endBlockNumber;
    if (!currentBlockNumber) {
        currentBlockNumber = await getCurrentBlockNumber(providerKey);
    }
    const spotPrice = await getSpotPriceOfPool(groTokenAddress, stableCoinAddress, currentBlockNumber);
    const currentBalance = await getBalanceOfGroInPool(currentBlockNumber);
    return {
        price: spotPrice,
        balance: currentBalance,
    };
}
module.exports = {
    fetchSwapEvents,
    fetchExitEvents,
    getSpotPriceOfPool,
    balanceOfGro,
    totalSupplyOfGro,
    fetchLBPData,
    getBalanceOfGroInPool,
};
