/* eslint-disable no-await-in-loop */
import { BigNumber, ethers } from 'ethers';
import { BigNumber as BN } from 'bignumber.js';
import {
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
    sendMessageToChannel,
} from '../../common/discord/discordService';
import { getCurrentApy } from './currentApyHandler';
import { ContractNames } from '../../registry/registry';
import { sendAlertMessage } from '../../common/alertMessageSender';
import aggregatorABI from '../abi/aggregator.json';
import poolABI from '../abi/Pool.json';
import routerABI from '../abi/uniswapRoute.json';
import erc20ABI from '../../contract/abis/ERC20.json';
import { getConfig } from '../../common/configUtil';
import { getLatestSystemContractOnAVAX } from '../common/contractStorage';
import { getEvents } from '../../common/logFilter-new';

const logger = require('../statsLogger');

const rpccURL =
    getConfig('avalanche.rpc_url', false) ||
    'https://api.avax.network/ext/bc/C/rpc';

const provider = new ethers.providers.JsonRpcProvider(rpccURL);
const blockNumberTimestamp = {};
const WAVAX = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';

const avaxAggregator = new ethers.Contract(
    '0x0A77230d17318075983913bC2145DB16C7366156',
    aggregatorABI,
    provider
);

const DAI_POOL = new ethers.Contract(
    '0x87dee1cc9ffd464b79e058ba20387c1984aed86a',
    poolABI,
    provider
);

const USDC_POOL = new ethers.Contract(
    '0xa389f9430876455c36478deea9769b7ca4e3ddb1',
    poolABI,
    provider
);

const USDT_POOL = new ethers.Contract(
    '0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256',
    poolABI,
    provider
);

const router = new ethers.Contract(
    '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    routerABI,
    provider
);

const joe = new ethers.Contract(
    '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
    erc20ABI,
    provider
);

const JOE_DAI_PATH = [
    '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
    '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
];

// constant
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const ZERO = BigNumber.from(0);
const TWO = BigNumber.from(2);
const DECIMALS = [
    BigNumber.from(10).pow(BigNumber.from(18)),
    BigNumber.from(10).pow(BigNumber.from(6)),
    BigNumber.from(10).pow(BigNumber.from(6)),
    BigNumber.from(10).pow(BigNumber.from(18)),
    BigNumber.from(10).pow(BigNumber.from(6)),
    BigNumber.from(10).pow(BigNumber.from(6)),
];
const POOLS = [DAI_POOL, USDC_POOL, USDT_POOL, DAI_POOL, USDC_POOL, USDT_POOL];
const MS_PER_YEAR = BigNumber.from('31536000');
const STABLECOINS = ['DAI.e', 'USDC.e', 'USDT.e', 'DAI.e', 'USDC.e', 'USDT.e'];
const RISK_FREE_RATE = BigNumber.from(2400);

const E18 = BigNumber.from(10).pow(BigNumber.from(18));
const BLOCKS_OF_3DAYS = 130000;
const START_TIME_STAMP = [
    1638707119, 1638549778, 1638549778, 1639664984, 1639664984, 1639664984,
];
const START_BLOCK = [7838860, 7759709, 7759709, 8317127, 8317127, 8317127];
const providerKey = 'stats_gro';

function getLatestAVAXContract(adapaterType) {
    return getLatestSystemContractOnAVAX(adapaterType, provider);
}

async function getBlockNumberTimestamp(blockNumber) {
    if (!blockNumberTimestamp[blockNumber]) {
        logger.info(`AVAX: Append timestamp for blockNumber ${blockNumber}`);
        const blockObject = await provider.getBlock(parseInt(blockNumber, 10));
        blockNumberTimestamp[blockNumber] = `${blockObject.timestamp}`;
    }
    return blockNumberTimestamp[blockNumber];
}

async function fetchTimestamp(transaction) {
    const { blockNumber } = transaction;
    transaction.timestamp = await getBlockNumberTimestamp(`${blockNumber}`);
    return transaction;
}

async function appendEventTimestamp(transactions) {
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(transactions[i]));
    }
    await Promise.all(promise);
}

async function getDaiAdjustEstimatedAssets(pendingJoe) {
    const joeToDai = await router.getAmountsOut(pendingJoe, JOE_DAI_PATH);
    logger.info(
        `Dai pending joe ${pendingJoe} joe2dai ${joeToDai[2]} joe2avax ${joeToDai[1]}`
    );
    return joeToDai[2].sub(joeToDai[1]);
}

async function getPositionOpenEvents(ahStrategy, startBlock, endBlock) {
    console.log(`ahStrategy address ${ahStrategy.address}`);
    const filter = ahStrategy.filters.LogNewPositionOpened();
    filter.fromBlock = startBlock;
    filter.toBlock = endBlock;
    console.log(`start ${startBlock} end ${endBlock}`);
    const logsObject = await getEvents(filter, ahStrategy.interface, provider);
    const logs = logsObject.data;
    console.log(`logs.length ${logs.length}`);
    await appendEventTimestamp(logs);
    const positionsOpened = {};
    logs.forEach((item) => {
        const openInfo = {
            block: item.blockNumber,
            positionId: item.args[0],
            price: item.args[1],
            collateralSize: item.args[2],
            debts: item.args[3],
            timestamp: item.timestamp,
        };
        positionsOpened[`${item.args[0]}`] = openInfo;
        console.log(`positionId ${item.args[0]}`);
        console.log(`price ${item.args[1]}`);
        console.log(`collateralSize ${item.args[2]}`);
        console.log(`debts ${item.args[3]}`);
    });
    return positionsOpened;
}

async function getLogPositionClosedEvents(ahStrategy, startBlock, endBlock) {
    const filter = ahStrategy.filters.LogPositionClosed();
    filter.fromBlock = startBlock;
    filter.toBlock = endBlock;
    const logsObject = await getEvents(filter, ahStrategy.interface, provider);
    const logs = logsObject.data;
    await appendEventTimestamp(logs);
    const positionsClosed = {};
    logs.forEach((item) => {
        const closeInfo = {
            block: item.blockNumber,
            positionId: item.args[0],
            wantRecieved: item.args[1],
            price: item.args[2],
            timestamp: item.timestamp,
        };
        positionsClosed[`${item.args[0]}`] = closeInfo;
        console.log(`positionId ${item.args[0]}`);
        console.log(`wantRecieved ${item.args[1]}`);
        console.log(`price ${item.args[2]}`);
    });
    return positionsClosed;
}

async function getLatestVaultAdapters() {
    const vaultAdaptorPromise = [];
    vaultAdaptorPromise.push(getLatestAVAXContract(ContractNames.AVAXDAIVault));
    vaultAdaptorPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDCVault)
    );
    vaultAdaptorPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDTVault)
    );
    vaultAdaptorPromise.push(
        getLatestAVAXContract(ContractNames.AVAXDAIVault_v1_5)
    );
    vaultAdaptorPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDCVault_v1_5)
    );
    vaultAdaptorPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDTVault_v1_5)
    );
    const vaultAdapters = await Promise.all(vaultAdaptorPromise);
    return vaultAdapters;
}

async function getLatestStrategies() {
    const strategiesPromise = [];
    strategiesPromise.push(
        getLatestAVAXContract(ContractNames.AVAXDAIStrategy)
    );
    strategiesPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDCStrategy)
    );
    strategiesPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDTStrategy)
    );
    strategiesPromise.push(
        getLatestAVAXContract(ContractNames.AVAXDAIStrategy_v1_5)
    );
    strategiesPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDCStrategy_v1_5)
    );
    strategiesPromise.push(
        getLatestAVAXContract(ContractNames.AVAXUSDTStrategy_v1_5)
    );
    const strategies = await Promise.all(strategiesPromise);
    return strategies;
}
function getUSDValue(value, decimalIndex) {
    if (value.isZero()) return ZERO;
    // console.log(
    //     `getUSDValue decimalIndex ${decimalIndex} ${DECIMALS[decimalIndex]}`
    // );
    return value.mul(E18).div(DECIMALS[decimalIndex]);
}
function calculateSharePercent(assets, total) {
    return total.isZero() ? ZERO : assets.mul(SHARE_DECIMAL).div(total);
}

function getBNSqrt(value) {
    const valueBN = new BN(value.toNumber()).sqrt();
    const root = BigNumber.from(valueBN.toFixed(0));
    return root;
}

async function calculatePositionReturn(
    vaultAdapter,
    vaultIndex,
    strategyContract,
    openBlock,
    endBlock,
    duration,
    positionId,
    closed
) {
    const openTotalSupply = await vaultAdapter.totalSupply({
        blockTag: openBlock,
    });
    const openEstimated = await vaultAdapter.totalEstimatedAssets({
        blockTag: openBlock,
    });

    const openPricePerShare = openEstimated
        .mul(DECIMALS[vaultIndex])
        .div(openTotalSupply);
    // console.log(
    //     `${openBlock} openTotalSupply ${openTotalSupply} openEstimated ${openEstimated}`
    // );
    const closeTotalSupply = await vaultAdapter.totalSupply({
        blockTag: endBlock,
    });
    let closeEstimated = await vaultAdapter.totalEstimatedAssets({
        blockTag: endBlock,
    });
    // fix dai estimated bug
    let fix = ZERO;
    if (vaultIndex === 0) {
        let joeAmount = ZERO;
        if (closed) {
            joeAmount = await joe.balanceOf(strategyContract.address, {
                blockTag: endBlock,
            });
        } else {
            joeAmount = await strategyContract.pendingYieldToken(positionId);
        }
        if (joeAmount.gt(ZERO)) {
            fix = await getDaiAdjustEstimatedAssets(joeAmount);
            // console.log(`pre ${closeEstimated} ${fix}`);
            closeEstimated = closeEstimated.add(fix);
            // console.log(`after ${closeEstimated} `);
        }
    }
    const closePricePerShare = closeEstimated
        .mul(DECIMALS[vaultIndex])
        .div(closeTotalSupply);

    const positionReturn = closePricePerShare
        .sub(openPricePerShare)
        .mul(SHARE_DECIMAL)
        .mul(MS_PER_YEAR)
        .div(openPricePerShare)
        .div(duration);
    // console.log(
    //     `~~~~~ openPricePerShare ${openPricePerShare} closePricePerShare ${closePricePerShare} apy ${positionReturn}`
    // );
    const positionInfo = await strategyContract.getPosition(positionId, {
        blockTag: openBlock,
    });
    let wantOpen = positionInfo[2][0];
    const strategyInfoBefore = await vaultAdapter.strategies(
        strategyContract.address,
        {
            blockTag: endBlock - 1,
        }
    );
    // console.log(`strategyInfoBefore ${JSON.stringify(strategyInfoBefore)}`);
    const strategyInfoAfter = await vaultAdapter.strategies(
        strategyContract.address,
        {
            blockTag: endBlock,
        }
    );
    // console.log(`strategyInfoAfter ${JSON.stringify(strategyInfoAfter)}`);
    const profit = strategyInfoAfter.totalGain.sub(
        strategyInfoBefore.totalGain
    );
    const loss = strategyInfoAfter.totalLoss.sub(strategyInfoBefore.totalLoss);
    let wantClose = wantOpen.add(profit).sub(loss);
    if (profit.eq(ZERO) && loss.eq(ZERO)) {
        wantOpen = strategyInfoAfter.totalDebt;
        wantClose = await strategyContract.estimatedTotalAssets({
            blockTag: endBlock,
        });
        if (vaultIndex === 0) {
            wantClose = wantClose.add(fix);
            console.log(`strategy after ${wantClose} `);
        }
        logger.info(`withdraw ${wantOpen} ${wantClose}`);
    }
    logger.info(
        `gain/loss ${strategyInfoAfter.totalDebt} + ${strategyInfoAfter.totalGain} ${strategyInfoBefore.totalGain} - ${strategyInfoAfter.totalLoss} ${strategyInfoBefore.totalLoss}`
    );
    return { wantOpen, wantClose, positionReturn };
}

function getTvlStats(assets) {
    logger.info('getTvlStats');

    const tvl = {
        'groDAI.e_vault': assets[0],
        'groUSDC.e_vault': assets[1],
        'groUSDT.e_vault': assets[2],
        'groDAI.e_vault_v1_5': assets[3],
        'groUSDC.e_vault_v1_5': assets[4],
        'groUSDT.e_vault_v1_5': assets[5],
        total: assets[0]
            .add(assets[1])
            .add(assets[2])
            .add(assets[3])
            .add(assets[4])
            .add(assets[5]),
    };
    return tvl;
}

function calculateMatrix(
    timeWeightedAverageReturn,
    totalDuration,
    returns,
    durations
) {
    let sharpeReturnSum = ZERO;
    let sortinoReturnSum = ZERO;
    for (let i = 0; i < returns.length; i += 1) {
        const diff = returns[i].sub(timeWeightedAverageReturn);
        const weightedProduct = diff.pow(TWO).mul(durations[i]);
        sharpeReturnSum = sharpeReturnSum.add(weightedProduct);
        if (returns[i].lt(ZERO)) {
            sortinoReturnSum = sortinoReturnSum.add(weightedProduct);
        }
    }
    // M-1/M  M means the count of position
    let adjust = BigNumber.from(100);
    if (returns.length > 1) {
        const m = ((returns.length - 1) * 100) / returns.length;
        adjust = BigNumber.from(parseInt(`${m}`, 10));
        console.log(`m-1 ${adjust}`);
    }
    const stdDivReturn = getBNSqrt(
        sharpeReturnSum.div(totalDuration).div(adjust)
    ).div(BigNumber.from(10));

    const stdDivNegativeReturn = getBNSqrt(
        sortinoReturnSum.div(totalDuration).div(adjust)
    ).div(BigNumber.from(10));
    console.log(
        `stdDivReturn ${stdDivReturn} stdDivNegativeReturn ${stdDivNegativeReturn}`
    );
    const returnsExcludeRiskFree =
        timeWeightedAverageReturn.sub(RISK_FREE_RATE);

    let sharpeRatio = ZERO;
    if (stdDivReturn.gt(ZERO)) {
        sharpeRatio = returnsExcludeRiskFree
            .mul(SHARE_DECIMAL)
            .div(stdDivReturn);
    }

    let sortinoRatio = ZERO;
    if (stdDivNegativeReturn.gt(ZERO)) {
        sortinoRatio = returnsExcludeRiskFree
            .mul(SHARE_DECIMAL)
            .div(stdDivNegativeReturn);
    }

    return {
        sharpeRatio,
        sortinoRatio,
    };
}

async function getVaultsTvl(blockTag) {
    logger.info('TvlSgetVaultsTvltats');
    const vaults = await getLatestVaultAdapters();
    const promises = [];
    for (let i = 0; i < vaults.length; i += 1) {
        promises.push(vaults[i].contract.totalAssets(blockTag));
    }
    const assetsInWant = await Promise.all(promises);
    const assets = [];
    for (let i = 0; i < vaults.length; i += 1) {
        logger.info(`vault assets ${i} ${assetsInWant[i]}`);
        assets[i] = getUSDValue(assetsInWant[i], i);
    }
    return assets;
}

async function getAvaxExposure(
    strategyContract,
    vaultAssets,
    vaultIndex,
    avaxprice,
    positionId
) {
    // exposure
    const positionInfo = await strategyContract.getPosition(positionId);
    const collateralSize = positionInfo[4];
    const debt = positionInfo[5];
    console.log(`collateralSize ${collateralSize} ${debt}`);
    const swapPool = POOLS[vaultIndex];
    const token0 = await swapPool.token0();
    const token1 = await swapPool.token1();
    const poolReserves = await swapPool.getReserves();
    const poolTotalSupply = await swapPool.totalSupply();
    console.log(`token0 == WAVAX ${token0.toLowerCase() == WAVAX}`);
    const totalAvax =
        token0.toLowerCase() == WAVAX ? poolReserves[0] : poolReserves[1];
    const avaxAmount = totalAvax.mul(collateralSize).div(poolTotalSupply);
    const diff = avaxAmount.sub(debt[0]);
    console.log(
        `++++  totalAvax ${totalAvax} poolTotalSupply ${poolTotalSupply} avaxAmount ${avaxAmount} debt[0] ${debt[0]} ${avaxprice} ${vaultAssets} poolReserves0 ${poolReserves[0]}  poolReserves1 ${poolReserves[1]} diff ${diff} ${token0} ${token1}`
    );
    const avaxExposure = diff
        .mul(avaxprice)
        .mul(SHARE_DECIMAL)
        .div(vaultAssets)
        .div(E18);
    logger.info(`avaxExposure ${avaxExposure}`);
    return avaxExposure;
}

async function calculateVaultReturn(
    vaultAdapter,
    vaultIndex,
    endBlock,
    endTimestamp,
    strategyContract
) {
    const startBlock = START_BLOCK[vaultIndex];
    const startTimestamp = START_TIME_STAMP[vaultIndex];
    const startTotalSupply = await vaultAdapter.totalSupply({
        blockTag: startBlock,
    });
    const startEstimated = await vaultAdapter.totalEstimatedAssets({
        blockTag: startBlock,
    });
    let openPricePerShare = DECIMALS[vaultIndex];
    if (!startTotalSupply.isZero()) {
        openPricePerShare = startEstimated
            .mul(DECIMALS[vaultIndex])
            .div(startTotalSupply);
    }
    // console.log(
    //     `${startBlock} openTotalSupply ${startTotalSupply} openEstimated ${startEstimated}`
    // );
    const closeTotalSupply = await vaultAdapter.totalSupply({
        blockTag: endBlock,
    });
    let closeEstimated = await vaultAdapter.totalEstimatedAssets({
        blockTag: endBlock,
    });
    if (vaultIndex === 0) {
        const positionId = await strategyContract.activePosition();
        let joeAmount = ZERO;
        if (positionId.gt(ZERO)) {
            joeAmount = await strategyContract.pendingYieldToken(positionId);
        } else {
            joeAmount = await joe.balanceOf(strategyContract.address, {
                blockTag: endBlock,
            });
        }
        if (joeAmount.gt(ZERO)) {
            const fix = await getDaiAdjustEstimatedAssets(joeAmount);
            console.log(`vault pre ${closeEstimated} ${fix}`);
            closeEstimated = closeEstimated.add(fix);
            console.log(`vault after ${closeEstimated} `);
        }
    }
    console.log(
        `apy === closeTotalSupply ${closeTotalSupply} closeEstimated ${closeEstimated} endBlock ${endBlock}`
    );
    const closePricePerShare = closeEstimated
        .mul(DECIMALS[vaultIndex])
        .div(closeTotalSupply);
    console.log(
        `apy duration endTimestamp ${endTimestamp} startTimestamp ${startTimestamp} duration ${
            endTimestamp - startTimestamp
        } === closeTotalSupply ${closeTotalSupply} closeEstimated ${closeEstimated} openPricePerShare ${openPricePerShare} closePricePerShare ${closePricePerShare}`
    );
    const diff = endTimestamp - startTimestamp;
    const duration = BigNumber.from(diff);
    const vaultReturn = closePricePerShare
        .sub(openPricePerShare)
        .mul(SHARE_DECIMAL)
        .mul(MS_PER_YEAR)
        .div(openPricePerShare)
        .div(duration);

    let vaultReturn3Days = vaultReturn;
    // console.log(
    //     `endBlock - BLOCKS_OF_3DAYS ${
    //         endBlock - BLOCKS_OF_3DAYS
    //     } startBlock ${startBlock}`
    // );
    if (endBlock - BLOCKS_OF_3DAYS > startBlock) {
        const blockNumber3DaysAgo = endBlock - BLOCKS_OF_3DAYS;
        const block3DaysAgo = await provider.getBlock(blockNumber3DaysAgo);
        logger.info(`block.timestamp 3days ago ${block3DaysAgo.timestamp}`);
        const startTotalSupply = await vaultAdapter.totalSupply({
            blockTag: blockNumber3DaysAgo,
        });
        const startEstimated = await vaultAdapter.totalEstimatedAssets({
            blockTag: blockNumber3DaysAgo,
        });
        let open3DaysAgoPricePerShare = DECIMALS[vaultIndex];
        if (!startEstimated.isZero()) {
            open3DaysAgoPricePerShare = startEstimated
                .mul(DECIMALS[vaultIndex])
                .div(startTotalSupply);
        }
        const duration = BigNumber.from(endTimestamp - block3DaysAgo.timestamp);
        vaultReturn3Days = closePricePerShare
            .sub(open3DaysAgoPricePerShare)
            .mul(SHARE_DECIMAL)
            .mul(MS_PER_YEAR)
            .div(openPricePerShare)
            .div(duration);
        console.log(
            `~~~~ 3days ${duration} ${blockNumber3DaysAgo} open3DaysAgoTotalSupply ${startTotalSupply} open3DaysAgoEstimated ${startEstimated} open3DaysAgoPricePerShare ${open3DaysAgoPricePerShare}`
        );
    }

    console.log(
        `vaultReturn ${vaultReturn} vaultReturn3Days ${vaultReturn3Days}`
    );
    return { vaultReturn, vaultReturn3Days };
}

async function calculateVaultRealizedReturn(
    vaultAdapter,
    vaultIndex,
    positions
) {
    const startBlock = START_BLOCK[vaultIndex];
    const startTimestamp = START_TIME_STAMP[vaultIndex];
    const openPricePerShare = await vaultAdapter.getPricePerShare({
        blockTag: startBlock,
    });
    // console.log(
    //     `${startBlock} openTotalSupply ${startTotalSupply} openEstimated ${startEstimated}`
    // );
    const lastPosition = positions[positions.length - 1];
    console.log(`lastPosition ${JSON.stringify(lastPosition)}`);
    const closePricePerShare = await vaultAdapter.getPricePerShare({
        blockTag: lastPosition.block,
    });
    console.log(
        `vault return duration lastPosition.timestamp ${
            lastPosition.timestamp
        } startTimestamp ${startTimestamp} duration ${
            lastPosition.timestamp - startTimestamp
        } openPricePerShare ${openPricePerShare} closePricePerShare ${closePricePerShare}`
    );
    const diff = lastPosition.timestamp - startTimestamp;
    const duration = BigNumber.from(diff);
    const vaultReturn = closePricePerShare
        .sub(openPricePerShare)
        .mul(SHARE_DECIMAL)
        .mul(MS_PER_YEAR)
        .div(openPricePerShare)
        .div(duration);

    let vaultReturn3Days = vaultReturn;
    // console.log(
    //     `endBlock - BLOCKS_OF_3DAYS ${
    //         endBlock - BLOCKS_OF_3DAYS
    //     } startBlock ${startBlock}`
    // );
    let timestampPositionClosed3DayAgo = START_TIME_STAMP[vaultIndex];
    let endBlockPositionClosed3DayAgo = START_BLOCK[vaultIndex];
    const cutOffTime = lastPosition.timestamp - 3600 * 24 * 3;
    for (let pidx = 0; pidx < positions.length; pidx += 1) {
        const ptn = positions[pidx];
        logger.info(
            ` ptn ${ptn.timestamp} ${timestampPositionClosed3DayAgo} ${lastPosition.timestamp} ${cutOffTime}`
        );
        if (
            ptn.timestamp > timestampPositionClosed3DayAgo &&
            ptn.timestamp < cutOffTime
        ) {
            logger.info(` ptn less ${ptn.timestamp} ${cutOffTime}`);
            endBlockPositionClosed3DayAgo = ptn.block;
            timestampPositionClosed3DayAgo = ptn.timestamp;
        }
    }
    if (endBlockPositionClosed3DayAgo > startBlock) {
        logger.info(
            `block.timestamp 3days ago ${endBlockPositionClosed3DayAgo}`
        );
        const open3DaysAgoPricePerShare = await vaultAdapter.getPricePerShare({
            blockTag: endBlockPositionClosed3DayAgo,
        });
        const duration = BigNumber.from(
            lastPosition.timestamp - timestampPositionClosed3DayAgo
        );
        vaultReturn3Days = closePricePerShare
            .sub(open3DaysAgoPricePerShare)
            .mul(SHARE_DECIMAL)
            .mul(MS_PER_YEAR)
            .div(openPricePerShare)
            .div(duration);
        logger.info(
            `~~~~ realized 3days ${duration} ${timestampPositionClosed3DayAgo} open3DaysAgoPricePerShare ${open3DaysAgoPricePerShare}`
        );
    }

    logger.info(
        `realized  vaultReturn ${vaultReturn} vaultReturn3Days ${vaultReturn3Days}`
    );
    return { vaultReturn, vaultReturn3Days };
}

async function getAvaxSystemStats() {
    //@ts-ignore
    const block = await provider.getBlock();
    logger.info(`block.number ${block.number}`);
    const blockTag = { blockTag: block.number };
    logger.info('SystemStats');
    const latestVaults = await getLatestVaultAdapters();
    const latestStrategies = await getLatestStrategies();
    const vaultsTvl = await getVaultsTvl(blockTag);
    const tvl = await getTvlStats(vaultsTvl);
    const labsVault = [];
    const aggregatorPrice = await avaxAggregator.latestAnswer();
    logger.info(`aggregatorPrice: ${aggregatorPrice}`);
    const avaxprice = aggregatorPrice.mul(E18).div(BigNumber.from(100000000));
    logger.info(`avaxprice: ${avaxprice}`);
    const tokenPriceUsd = {
        avax: avaxprice,
    };

    for (
        let vaultIndex = 0;
        vaultIndex < latestVaults.length;
        vaultIndex += 1
    ) {
        const vaultAdapter = latestVaults[vaultIndex].contract;
        const vaultContractInfo = latestVaults[vaultIndex].contractInfo;
        const vaultTvlUsd = vaultsTvl[vaultIndex];
        logger.info(`vault address: ${vaultAdapter.address}`);
        logger.info(
            `vault name: ${JSON.stringify(vaultContractInfo)} ${
                vaultContractInfo.metaData.N
            } ${vaultContractInfo.metaData.DN}`
        );
        const strategyContract = latestStrategies[vaultIndex].contract;
        const strategyContractInfo = latestStrategies[vaultIndex].contractInfo;
        logger.info(`strat address ${strategyContract.address}`);
        let vaultPercent = ZERO;
        const strategyParam = await vaultAdapter.strategies(
            strategyContract.address
        );
        const activePosition = await strategyContract.activePosition();
        logger.info(
            `strategyParam.totalDebt ${activePosition} ${strategyParam.totalDebt}`
        );

        const strategyTotalAssets = getUSDValue(
            strategyParam.totalDebt,
            vaultIndex
        );
        logger.info(`strategyTotalAssets ${strategyTotalAssets}`);

        const strategyPercent = calculateSharePercent(
            strategyTotalAssets,
            tvl.total
        );

        logger.info(`strategyPercent ${strategyPercent}`);

        vaultPercent = vaultPercent.add(strategyPercent);

        const depositLimit = await vaultAdapter.depositLimit();
        const depositLimitUsd = depositLimit.mul(E18).div(DECIMALS[vaultIndex]);
        logger.info(`depositLimitUsd ${depositLimitUsd}`);
        const strategyInfo = {
            name: strategyContractInfo.metaData.N,
            display_name: strategyContractInfo.metaData.DN,
            address: strategyContract.address,
            amount: strategyTotalAssets,
            share: strategyPercent,
            last3d_apy: ZERO,
            all_time_apy: ZERO,
            sharpe_ratio: ZERO,
            sortino_ratio: ZERO,
            romad_ratio: ZERO,
            tvl_cap: depositLimitUsd,
            open_position: {},
            past_5_closed_positions: [],
        };

        const reserveAssets = vaultTvlUsd.sub(strategyTotalAssets);
        const reserveShare = calculateSharePercent(reserveAssets, tvl.total);
        const reserves = {
            name: vaultContractInfo.metaData.N,
            display_name: vaultContractInfo.metaData.DN,
            amount: reserveAssets,
            share: reserveShare,
            last3d_apy: 0,
        };

        // logger.info(`estimatedVaultApy ${vaultIndex} ${estimatedVaultApy}`);
        const share = tvl.total.isZero()
            ? ZERO
            : calculateSharePercent(vaultsTvl[vaultIndex], tvl.total);
        const { vaultReturn, vaultReturn3Days } = await calculateVaultReturn(
            vaultAdapter,
            vaultIndex,
            block.number,
            block.timestamp,
            strategyContract
        );
        const labsVaultData = {
            name: vaultContractInfo.metaData.N,
            display_name: vaultContractInfo.metaData.DN,
            stablecoin: STABLECOINS[vaultIndex],
            amount: vaultsTvl[vaultIndex],
            share,
            all_time_apy: vaultReturn,
            last3d_apy: vaultReturn3Days,
            reserves,
            strategies: [strategyInfo],
        } as any;
        labsVault.push(labsVaultData);

        logger.info('openEvents');
        const openEvents = await getPositionOpenEvents(
            strategyContract,
            7408960,
            block.number
        );
        logger.info('closeEvents');

        const closeEvents = await getLogPositionClosedEvents(
            strategyContract,
            7408960,
            block.number
        );

        const positions = [];
        const keys = Object.keys(openEvents);
        console.log(`need check ${keys.length}`);
        let totalDuration = ZERO;
        let timeWeightedTotal = ZERO;
        let openPosition = {};
        let avaxExposure = ZERO;

        let closedPositions = [];
        const durations = [];
        const returns = [];
        const blockOfPositionClosed = [];
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            const open = openEvents[key];
            const close = closeEvents[key];
            if (close) {
                const duration = BigNumber.from(
                    close.timestamp - open.timestamp
                );
                totalDuration = totalDuration.add(duration);
                durations[i] = duration;
                const { wantOpen, wantClose, positionReturn } =
                    await calculatePositionReturn(
                        vaultAdapter,
                        vaultIndex,
                        strategyContract,
                        open.block,
                        close.block,
                        duration,
                        key,
                        true
                    );
                returns[i] = positionReturn;

                timeWeightedTotal = timeWeightedTotal.add(
                    positionReturn.mul(duration)
                );
                const positionInfo = {
                    open_ts: open.timestamp,
                    open_amount: wantOpen.mul(E18).div(DECIMALS[vaultIndex]),
                    close_ts: close.timestamp,
                    close_amount: wantClose.mul(E18).div(DECIMALS[vaultIndex]),
                    apy: positionReturn,
                };
                blockOfPositionClosed.push({
                    block: close.block,
                    timestamp: close.timestamp,
                });
                positions.push(positionInfo);
                logger.info(
                    `--- positionInfo ${key}\n open ${
                        positionInfo.open_amount
                    } ${positionInfo.open_ts} ${new Date(
                        positionInfo.open_ts * 1000
                    )}\n close ${positionInfo.close_amount} ${
                        positionInfo.close_ts
                    }  ${new Date(positionInfo.close_ts * 1000)} \n apy ${
                        positionInfo.apy
                    }\n`
                );
            } else {
                const duration = BigNumber.from(
                    block.timestamp - open.timestamp
                );
                const { wantOpen, wantClose, positionReturn } =
                    await calculatePositionReturn(
                        vaultAdapter,
                        vaultIndex,
                        strategyContract,
                        open.block,
                        block.number,
                        duration,
                        key,
                        false
                    );
                logger.info(
                    `activePosition ${vaultIndex} ${wantOpen} ${wantClose} ${positionReturn}`
                );
                openPosition = {
                    active_position: 'true',
                    open_ts: open.timestamp,
                    open_amount: wantOpen.mul(E18).div(DECIMALS[vaultIndex]),
                    current_amount: wantClose
                        .mul(E18)
                        .div(DECIMALS[vaultIndex]),
                    apy: positionReturn,
                };
                avaxExposure = await getAvaxExposure(
                    strategyContract,
                    vaultsTvl[vaultIndex],
                    vaultIndex,
                    avaxprice,
                    key
                );
            }
        }
        if (totalDuration.gt(ZERO)) {
            const timeWeightedAverageReturn =
                timeWeightedTotal.div(totalDuration);
            let sharpeReturnSum = ZERO;
            let sortinoReturnSum = ZERO;
            for (let i = 0; i < returns.length; i += 1) {
                const diff = returns[i].sub(timeWeightedAverageReturn);
                const weightedProduct = diff.pow(TWO).mul(durations[i]);
                sharpeReturnSum = sharpeReturnSum.add(weightedProduct);
                if (returns[i].lt(ZERO)) {
                    sortinoReturnSum = sortinoReturnSum.add(weightedProduct);
                }
            }
            const { sharpeRatio, sortinoRatio } = calculateMatrix(
                timeWeightedAverageReturn,
                totalDuration,
                returns,
                durations
            );
            console.log(
                `timeWeightedAverage ${timeWeightedTotal} ${totalDuration} ${timeWeightedAverageReturn} -- ${sharpeRatio} ${sortinoRatio}`
            );
            strategyInfo.sharpe_ratio = sharpeRatio;
            strategyInfo.sortino_ratio = sortinoRatio;

            if (positions.length > 5) {
                closedPositions = positions.slice(
                    positions.length - 5,
                    positions.length
                );
            } else {
                closedPositions = positions;
            }
        }
        if (vaultIndex === 0) {
            const { vaultReturn: daiVaultApy, vaultReturn3Days: daiLast3dApy } =
                await calculateVaultRealizedReturn(
                    vaultAdapter,
                    vaultIndex,
                    blockOfPositionClosed
                );
            labsVaultData.last3d_apy = daiLast3dApy;
            console.log(
                `labsVaultData.last3d_apy ${labsVaultData.last3d_apy} ${daiLast3dApy}`
            );
        }
        labsVaultData.avax_exposure = avaxExposure;
        strategyInfo.open_position = openPosition;
        strategyInfo.past_5_closed_positions = closedPositions;
    }

    const systemStats = {
        launch_timestamp: '1637746393',
        tvl,
        token_price_usd: tokenPriceUsd,
        labs_vault: labsVault,
    };
    return systemStats;
}

export { getTvlStats, getAvaxSystemStats };