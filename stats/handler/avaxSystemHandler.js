/* eslint-disable no-await-in-loop */
const { BigNumber, ethers } = require('ethers');
const { BigNumber: BN } = require('bignumber.js');
const {
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
    sendMessageToChannel,
} = require('../../dist/common/discord/discordService');
const logger = require('../statsLogger');
const { getCurrentApy } = require('./currentApyHandler');
const { ContractNames } = require('../../dist/registry/registry');
const { sendAlertMessage } = require('../../dist/common/alertMessageSender');
const aggregatorABI = require('../abi/aggregator.json');
const poolABI = require('../abi/Pool.json');
const { getConfig } = require('../../dist/common/configUtil');
const { getLatestSystemContractOnAVAX } = require('../common/contractStorage');
const { getEvents } = require('../../dist/common/logFilter-new');
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
// constant
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const THRESHOLD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);
const DECIMALS = [
    BigNumber.from(10).pow(BigNumber.from(18)),
    BigNumber.from(10).pow(BigNumber.from(6)),
    BigNumber.from(10).pow(BigNumber.from(6)),
];
const POOLS = [DAI_POOL, USDC_POOL, USDT_POOL];
const MS_PER_YEAR = BigNumber.from('31536000');
const STABLECOINS = ['DAI.e', 'USDC.e', 'USDT.e'];
const RISK_FREE_RATE = BigNumber.from(600);

const E18 = BigNumber.from(10).pow(BigNumber.from(18));

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

async function getPositionOpenEvents(ahStrategy, startBlock, endBlock) {
    console.log(`ahStrategy address ${ahStrategy.address}`);
    const filter = ahStrategy.filters.LogNewPositionOpened();
    filter.fromBlock = startBlock;
    filter.toBlock = endBlock;
    console.log(`start ${startBlock} end ${endBlock}`);
    const logs = await getEvents(filter, ahStrategy.interface, provider);
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
    const logs = await getEvents(filter, ahStrategy.interface, provider);

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
    const strategies = await Promise.all(strategiesPromise);
    return strategies;
}
function getUSDValue(value, decimalIndex) {
    if (value.isZero()) return ZERO;
    console.log(
        `getUSDValue decimalIndex ${decimalIndex} ${DECIMALS[decimalIndex]}`
    );
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
    duration
) {
    const openTotalSupply = await vaultAdapter.totalSupply({
        blockTag: openBlock,
    });
    const openEstimated = await strategyContract.estimatedTotalAssets({
        blockTag: openBlock,
    });
    const openPricePerShare = openEstimated
        .mul(DECIMALS[vaultIndex])
        .div(openTotalSupply);
    console.log(
        `${openBlock} openTotalSupply ${openTotalSupply} openEstimated ${openEstimated}`
    );
    const closeTotalSupply = await vaultAdapter.totalSupply({
        blockTag: endBlock,
    });
    const closeEstimated = await strategyContract.estimatedTotalAssets({
        blockTag: endBlock,
    });
    const closePricePerShare = closeEstimated
        .mul(DECIMALS[vaultIndex])
        .div(closeTotalSupply);
    console.log(
        `closeTotalSupply ${closeTotalSupply} closeEstimated ${closeEstimated}`
    );
    const positionReturn = closePricePerShare
        .sub(openPricePerShare)
        .mul(SHARE_DECIMAL)
        .mul(MS_PER_YEAR)
        .div(openPricePerShare)
        .div(duration);
    return { openEstimated, closeEstimated, positionReturn };
}

function getTvlStats(assets) {
    logger.info('getTvlStats');

    const tvl = {
        'groDAI.e_vault': assets[0],
        'groUSDC.e_vault': assets[1],
        'groUSDT.e_vault': assets[2],
        total: assets[0].add(assets[1]).add(assets[2]),
    };
    return tvl;
}

async function getVaultsTvl(blockTag) {
    logger.info('TvlSgetVaultsTvltats');
    const vaults = await getLatestVaultAdapters(blockTag);
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

async function getAvaxSystemStats() {
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

        const labsVaultData = {
            name: vaultContractInfo.metaData.N,
            display_name: vaultContractInfo.metaData.DN,
            stablecoin: STABLECOINS[vaultIndex],
            amount: vaultsTvl[vaultIndex],
            share,
            last3d_apy: BigNumber.from(0),
            reserves,
            strategies: [strategyInfo],
        };
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
        let totalDuration = 0;
        let timeWeightedTotal = ZERO;
        let sqrtTotal = ZERO;
        let sqrtTotalNegative = ZERO;
        let interval = ZERO;
        let openPosition = {};
        let avaxExposure = ZERO;

        let closedPositions = [];
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            const open = openEvents[key];
            const close = closeEvents[key];
            if (close) {
                const duration = close.timestamp - open.timestamp;
                totalDuration += duration;
                const { openEstimated, closeEstimated, positionReturn } =
                    await calculatePositionReturn(
                        vaultAdapter,
                        vaultIndex,
                        strategyContract,
                        open.block,
                        close.block,
                        BigNumber.from(duration)
                    );
                const withRisk = positionReturn.sub(RISK_FREE_RATE);
                timeWeightedTotal = timeWeightedTotal.add(
                    positionReturn
                        .sub(RISK_FREE_RATE)
                        .mul(BigNumber.from(duration))
                );
                sqrtTotal = sqrtTotal.add(withRisk.pow(BigNumber.from(2)));

                if (positionReturn.lt(ZERO)) {
                    sqrtTotalNegative = sqrtTotalNegative.add(
                        withRisk.pow(BigNumber.from(2))
                    );
                }
                console.log(
                    `tttt totalDuration ${totalDuration} ${
                        duration / 3600
                    } ${withRisk} ${sqrtTotal}`
                );
                interval = interval.add(BigNumber.from(1));
                const positionInfo = {
                    open_ts: open.timestamp,
                    open_amount: openEstimated
                        .mul(E18)
                        .div(DECIMALS[vaultIndex]),
                    close_ts: close.timestamp,
                    close_amount: closeEstimated
                        .mul(E18)
                        .div(DECIMALS[vaultIndex]),
                    apy: positionReturn,
                };
                positions.push(positionInfo);
                console.log(
                    `--- positionInfo ${key} ${positionInfo.open_ts} ${positionInfo.open_amount} ${positionInfo.close_ts} ${positionInfo.close_amount} ${positionInfo.apy}`
                );
            } else {
                const duration = BigNumber.from(
                    block.timestamp - open.timestamp
                );
                const { openEstimated, closeEstimated, positionReturn } =
                    await calculatePositionReturn(
                        vaultAdapter,
                        vaultIndex,
                        strategyContract,
                        open.block,
                        block.number,
                        duration
                    );
                console.log(
                    `activePosition ${openEstimated} ${closeEstimated} ${positionReturn}`
                );
                openPosition = {
                    active_position: 'true',
                    open_ts: open.timestamp,
                    open_amount: openEstimated
                        .mul(E18)
                        .div(DECIMALS[vaultIndex]),
                    current_amount: closeEstimated
                        .mul(E18)
                        .div(DECIMALS[vaultIndex]),
                    apy: positionReturn,
                };

                const positionInfo = await strategyContract.getPosition(key);
                const collateralSize = positionInfo[4];
                const debt = positionInfo[5];
                console.log(`collateralSize ${collateralSize} ${debt}`);
                const swapPool = POOLS[vaultIndex];
                const token0 = await swapPool.token0();
                const poolReserves = await swapPool.getReserves();
                const poolTotalSupply = await swapPool.totalSupply();
                const totalAvax =
                    token0 === WAVAX ? poolReserves[0] : poolReserves[1];
                const avaxAmount = totalAvax
                    .mul(collateralSize)
                    .div(poolTotalSupply);
                console.log(
                    `++++  totalAvax ${totalAvax} poolTotalSupply ${poolTotalSupply} avaxAmount ${avaxAmount} debt[0] ${debt[0]}`
                );

                if (avaxAmount.gte(debt[0])) {
                    const avaxBalance = avaxAmount.sub(debt[0]);
                    avaxExposure = avaxBalance
                        .mul(avaxprice)
                        .mul(SHARE_DECIMAL)
                        .mul(DECIMALS[vaultIndex])
                        .div(E18)
                        .div(BigNumber.from(100000000));
                } else {
                    console.log('less');
                }
            }
        }
        if (totalDuration > 0) {
            const timeWeightedAverageReturn = timeWeightedTotal.div(
                BigNumber.from(totalDuration)
            );
            const stdDivReturn = getBNSqrt(sqrtTotal.div(interval));
            const stdDivNegativeReturn = getBNSqrt(
                sqrtTotalNegative.div(interval)
            );

            const sharpe = timeWeightedAverageReturn
                .mul(SHARE_DECIMAL)
                .div(stdDivReturn);

            const sortino = timeWeightedAverageReturn
                .mul(SHARE_DECIMAL)
                .div(stdDivNegativeReturn);

            const timeFactor = getBNSqrt(
                MS_PER_YEAR.div(BigNumber.from(totalDuration))
            );
            const sharpeRatio = sharpe.mul(timeFactor);
            const sortinoRatio = sortino.mul(timeFactor);
            console.log(
                `timeWeightedAverage ${timeWeightedTotal} ${totalDuration} ${timeWeightedAverageReturn} ${sqrtTotal} ${interval} -- ${sharpe} ${sortino} ${sharpeRatio} ${sortinoRatio}`
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
        strategyInfo.avax_exposure = avaxExposure;
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

module.exports = {
    getTvlStats,
    getAvaxSystemStats,
};
