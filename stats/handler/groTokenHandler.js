/* eslint-disable no-await-in-loop */
const { ethers, BigNumber } = require('ethers');
const fetch = require('node-fetch');
const { BigNumber: BN } = require('bignumber.js');
const logger = require('../statsLogger');
const { ContractNames } = require('../../registry/registry');
const {
    getLatestSystemContract: getLatestContract,
} = require('../common/contractStorage');
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const { getConfig } = require('../../common/configUtil');
const moment = require('moment');
const { findBlockByDate } = require('../../database/common/globalUtil');
const { callSubgraph } = require('../../common/subgraphCaller');
const { floatToBN } = require('../../common/digitalUtil');

const nodeEnv = process.env.NODE_ENV.toLowerCase();

// ABI
const UniswapRouteABI = require('../abi/uniswapRoute.json');
const UniswapABI = require('../abi/uniswap.json');
const GroABI = require('../abi/GRO.json');
const LpTokenStakerABI = require('../abi/LPTokenStaker.json');
const LpTokenABI = require('../abi/LpToken.json');
const CurvePoolABI = require('../abi/SwapPool.json');

const ONE = BigNumber.from('1000000000000000000');
const ZERO = BigNumber.from('0');
const YEAR = BigNumber.from('365');
const BLOCKS_PER_YEAR = BigNumber.from(2252571);
const BLOCKS_PER_DAY = 6400;
const WEEKS_PER_YEAR = BigNumber.from(52);
const GTOKEN_SCALE = BigNumber.from('1000000000000');
const providerKey = 'stats_gro';

// Contract
let lpTokenStaker;
let groVault;
let groPwrd;
let groToken;
let uniswapRoute;
let uniswapGroGvtPool;
let groPwrdUsdcLpToken;
let uniswapGroUsdcPool;
let curvePwrd3crvPool;
let curve3Pool;
let curve3CrvLpToken;

// build pool
const pool0Config = getConfig('staker_pools.single_staking_100_gro_0');
const pool1Config = getConfig('staker_pools.uniswap_v2_5050_gro_gvt_1');
const pool2Config = getConfig('staker_pools.uniswap_v2_5050_gro_usdc_2');
const pool3Config = getConfig('staker_pools.single_staking_100_gvt_3');
const pool4Config = getConfig('staker_pools.curve_meta_pwrd_3crv_4');
const pool5Config = getConfig('staker_pools.balancer_v2_8020_gro_weth_5');

// Uniswap v2 subgraph
const sgUniswapURL = getConfig('subgraph.uniswapV2_graph_url');
const sgGroUsdcPoolId = getConfig('subgraph.uniswapV2_pair_id_gro_usdc');
const sgGvtGroPoolId = getConfig('subgraph.uniswapV2_pair_id_gvt_gro');
const UNISWAP_SWAP_FEE = 0.003;

// Balancer v2 subgraph
const sgBalancerURL = getConfig('subgraph.balancerV2_graph_url');
const sgGroWethPoolId = getConfig('subgraph.balancerV2_pool_id_gro_weth');

function getLatestSystemContract(contractName) {
    return getLatestContract(contractName, providerKey);
}

function printUsd(value) {
    return BN(value.toString())
        .div(BN(10).pow(BN(18)))
        .toFixed(7)
        .toString();
}

function printPercent(value) {
    return BN(value.toString())
        .div(BN(10).pow(BN(18)))
        .toFixed(4)
        .toString();
}

async function initContracts() {
    logger.info('init contract');
    const provider = getAlchemyRpcProvider(providerKey);

    // const groAddress = '0x9892fff05b42adc940c251ca879d912dfa94c731';
    // // const gvtAddress = '0x4394be2135357833a9e18d5a73b2a0c629efe984';
    // const stakerAddress = '0xCD72ccA707C61C2d7361F99B6c66bC312dB50BF7';
    // const oracleAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    // const uniPoolGroGvtAddress = '0x02910bC117C6F1E7347aEF1A8e94a0B45041EF3F';
    // const pwrdUsdcLpAddress = '0x0f1801f97eb62ee5dbf2b809aed75a6f1223694a';
    // const uniPoolGropwrdUsdcLpAddress =
    //     '0x8dca588009f5de368a5660f415d029e7820a3368';
    // const curvePwrd3crvPoolAddress =
    //     '0x613081F24c4d5D797dca6480ccA67611224d7f41';
    // const curve3poolAddress = '0x930e1D35BeF80A1FF7Cb70DcFf295Ed97D187c58';
    // // const underlyingCoinAddress = '0xCAdC58879f214a47Eb15B3Ac6eCfBdC29fb17F28';
    // const curve3crvAddress = '0xF92594660CAE88FC36C63d542266eA57575a08BC';

    const groAddress = getConfig('staker_pools.contracts.gro_address');
    const stakerAddress = getConfig('staker_pools.contracts.staker_address');
    const oracleAddress = getConfig(
        'staker_pools.contracts.gro_price_oracle_address'
    );
    const uniPoolGroGvtAddress = getConfig(
        'staker_pools.contracts.uniswap_gro_gvt_pool_address'
    );
    const pwrdUsdcLpAddress = getConfig(
        'staker_pools.contracts.pwrd_usdc_lp_address'
    );
    const uniPoolGroUsdcAddress = getConfig(
        'staker_pools.contracts.uniswap_gro_usdc_pool_address'
    );
    const curvePwrd3crvPoolAddress = getConfig(
        'staker_pools.contracts.curve_pwrd3crv_pool_address'
    );
    const curve3poolAddress = getConfig(
        'staker_pools.contracts.curve_3pool_address'
    );
    const curve3crvAddress = getConfig(
        'staker_pools.contracts.curve_3crv_address'
    );

    lpTokenStaker = new ethers.Contract(
        stakerAddress,
        LpTokenStakerABI,
        provider
    );

    groVault = await getLatestSystemContract(ContractNames.groVault).contract;
    groPwrd = await getLatestSystemContract(ContractNames.powerD).contract;
    groToken = new ethers.Contract(groAddress, GroABI, provider);

    uniswapRoute = new ethers.Contract(
        oracleAddress,
        UniswapRouteABI,
        provider
    );
    uniswapGroGvtPool = new ethers.Contract(
        uniPoolGroGvtAddress,
        UniswapABI,
        provider
    );

    uniswapGroUsdcPool = new ethers.Contract(
        uniPoolGroUsdcAddress,
        UniswapABI,
        provider
    );

    groPwrdUsdcLpToken = new ethers.Contract(
        pwrdUsdcLpAddress,
        LpTokenABI,
        provider
    );

    curvePwrd3crvPool = new ethers.Contract(
        curvePwrd3crvPoolAddress,
        CurvePoolABI,
        provider
    );
    curve3Pool = new ethers.Contract(curve3poolAddress, CurvePoolABI, provider);
    curve3CrvLpToken = new ethers.Contract(
        curve3crvAddress,
        LpTokenABI,
        provider
    );
}

async function getCoingeckoPrice(id) {
    let price = BigNumber.from(0);
    try {
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
        );
        if (res) {
            const data = await res.json();
            logger.info(`usd ${data.balancer.usd}`);
            price = floatToBN(data.balancer.usd);
        } else {
            logger.error('Parser price data failed.');
            return price;
        }
    } catch (error) {
        logger.error(error);
        return price;
    }
    return price;
}

async function readUniswapPool(
    uniswapPool,
    tokenAUsdPrice,
    tokenBUsdPrice,
    blockTag
) {
    const reserved = await uniswapPool.getReserves(blockTag);
    logger.info(`Uniswap reserved ${reserved[0]} ${reserved[1]}`);
    const tvl = reserved[0]
        .mul(tokenAUsdPrice)
        .div(ONE)
        .add(reserved[1].mul(tokenBUsdPrice).div(ONE));
    logger.info(`tvl ${tvl}`);

    const stakedLP = await uniswapPool.balanceOf(
        lpTokenStaker.address,
        blockTag
    );
    logger.info(`stakedLP ${stakedLP}`);
    const totalLP = await uniswapPool.totalSupply(blockTag);
    logger.info(`total ${totalLP}`);
    const lpPrice = tvl.mul(ONE).div(totalLP);
    logger.info(`lpPrice ${lpPrice}`);
    const poolInfo = {
        tvl,
        stakedLP,
        totalLP,
        lpPrice,
        reserved,
    };
    return poolInfo;
}

async function readUniswapPoolWithDecimal(
    uniswapPool,
    tokenAUsdPrice,
    tokenBUsdPrice,
    tokenADecimal,
    tokenBDecimal,
    blockTag
) {
    const reserved = await uniswapPool.getReserves(blockTag);
    logger.info(`Uniswap reserved ${reserved[0]} ${reserved[1]}`);
    const tvl = reserved[0]
        .mul(tokenAUsdPrice)
        .div(ONE)
        .add(reserved[1].mul(tokenBUsdPrice).div(tokenBDecimal));
    logger.info(
        `tvl ${tvl} ${tokenBUsdPrice} ${tokenBDecimal} ${reserved[1]
            .mul(tokenBUsdPrice)
            .div(tokenBDecimal)}`
    );

    const stakedLP = await uniswapPool.balanceOf(
        lpTokenStaker.address,
        blockTag
    );
    logger.info(`stakedLP ${stakedLP}`);
    const totalLP = await uniswapPool.totalSupply(blockTag);
    logger.info(`total ${totalLP}`);
    const lpPrice = tvl.mul(ONE).div(totalLP);
    logger.info(`lpPrice ${lpPrice}`);
    const poolInfo = {
        tvl,
        stakedLP,
        totalLP,
        lpPrice,
        reserved,
    };
    return poolInfo;
}

async function getGroPriceFromUniswap(blockTag) {
    logger.info('start getGroPriceFromUniswap');
    const groGvtPricePair = await uniswapRoute.getAmountsOut(
        ONE,
        [groToken.address, groVault.address],
        blockTag
    );
    const groPriceInGvt = groGvtPricePair[1];
    logger.info(`groGvtPricePair ${groGvtPricePair[0]} ${groGvtPricePair[1]}`);

    const gvtPriceInUsd = await groVault.getPricePerShare(blockTag);
    logger.info(`gvtPriceInUsd ${gvtPriceInUsd}`);

    const groPriceInUsd = gvtPriceInUsd.mul(groPriceInGvt).div(ONE);
    logger.info(`groPriceInUsd ${groPriceInUsd}`);
    return {
        groPriceInGvt,
        groPriceInUsd,
        gvtPriceInUsd,
    };
}

// async function getGroPwrd3crvPriceFromUniswap(blockTag) {
//     logger.info(blockTag.blockTag);
//     logger.info('start getGroPwrd3crvPriceFromUniswap');
//     const groLpPricePair = await uniswapRoute.getAmountsOut(
//         ONE,
//         [groPwrdUsdcLpToken.address, groToken.address],
//         blockTag
//     );
//     logger.info('after groLpPricePair');
//     const lpPriceInGro = groLpPricePair[1];
//     logger.info(`groLpPricePair ${groLpPricePair[0]} ${groLpPricePair[1]}`);

//     const { groPriceInUsd } = await getGroPriceFromUniswap(blockTag);
//     logger.info(`groPriceInUsd ${groPriceInUsd}`);

//     const lpPriceInUsd = lpPriceInGro.mul(groPriceInUsd).div(ONE);
//     logger.info(`lpPriceInUsd ${lpPriceInUsd}`);
//     return {
//         lpPriceInGro,
//         groPriceInUsd,
//         lpPriceInUsd,
//     };
// }

async function getUniswapGroGvtStats(
    priceOracle,
    currentApy,
    groPerBlock,
    totalAllocPoint,
    latestBlock,
    block24hAgo
) {
    // pool-0
    const poolOneInfo = await readUniswapPool(
        uniswapGroGvtPool,
        priceOracle.gvtPriceInUsd,
        priceOracle.groPriceInUsd,
        latestBlock
    );

    // const tag24HoursAgo = {
    //     blockTag: latestBlock.blockTag - 6400,
    // };
    // const priceOracle24HoursAgo = await getGroPriceFromUniswap(tag24HoursAgo);
    // const poolOneInfo24HoursAgo = await readUniswapPool(
    //     uniswapGroGvtPool,
    //     priceOracle24HoursAgo.gvtPriceInUsd,
    //     priceOracle24HoursAgo.groPriceInUsd,
    //     tag24HoursAgo
    // );
    // TODO : find out how to calculate fee
    // poolOneInfo.feeApy = poolOneInfo.lpPrice
    //     .sub(poolOneInfo24HoursAgo.lpPrice)
    //     .mul(ONE)
    //     .div(poolOneInfo24HoursAgo.lpPrice)
    //     .mul(BigNumber.from(365));
    // if (poolOneInfo.feeApy.lte(BigNumber.from(0))) {
    //     poolOneInfo.feeApy = BigNumber.from(0);
    // }
    //poolOneInfo.feeApy = ZERO;

    const groGvtFees = await calcFees('uniswap_v2_5050_gro_gvt_1', block24hAgo);
    const annGroGvt = groGvtFees.mul(YEAR).mul(ONE).div(poolOneInfo.tvl);
    poolOneInfo.feeApy = annGroGvt;
    logger.info(
        `poolOneInfo.feeApy ${poolOneInfo.feeApy}, groGvtFees: ${groGvtFees}`
    );

    poolOneInfo.tokenApy = currentApy.gvt
        .mul(GTOKEN_SCALE)
        .div(BigNumber.from(2));
    logger.info(
        `currentApy.gvt ${currentApy.gvt} tokenApy ${poolOneInfo.tokenApy}`
    );

    const poolOneStakingInfo = await lpTokenStaker.poolInfo(
        pool1Config.pid,
        latestBlock
    );
    logger.info(
        `groPerBlock ${groPerBlock} poolOneInfo ${poolOneStakingInfo.allocPoint} totalAllocPoint ${totalAllocPoint}`
    );
    if (poolOneInfo.stakedLP.isZero()) {
        poolOneInfo.rewardApy = BigNumber.from(0);
    } else {
        poolOneInfo.rewardApy = groPerBlock
            .mul(priceOracle.groPriceInUsd)
            .mul(BLOCKS_PER_YEAR)
            .mul(ONE)
            .mul(poolOneStakingInfo.allocPoint)
            .div(totalAllocPoint)
            .div(poolOneInfo.stakedLP.mul(poolOneInfo.lpPrice));
    }

    logger.info(`rewardApy ${poolOneInfo.rewardApy}`);
    poolOneInfo.totalApy = poolOneInfo.feeApy
        .add(poolOneInfo.tokenApy)
        .add(poolOneInfo.rewardApy);
    logger.info(`poolOneTotalApy ${poolOneInfo.totalApy}`);
    poolOneInfo.tvlStaked = poolOneInfo.stakedLP
        .mul(poolOneInfo.lpPrice)
        .div(ONE);
    return poolOneInfo;
}

async function getUniswapGroUsdcStats(
    priceOracle,
    currentApy,
    groPerBlock,
    totalAllocPoint,
    latestBlock,
    block24hAgo
) {
    // pool-0
    const poolOneInfo = await readUniswapPoolWithDecimal(
        uniswapGroUsdcPool,
        priceOracle.groPriceInUsd,
        ONE,
        ONE,
        BigNumber.from('1000000'),
        latestBlock
    );

    // let tagBlock = latestBlock.blockTag - 6400;
    // let duration = 365;
    // if (tagBlock < pool2Config.start_block) {
    //     tagBlock = pool2Config.start_block;
    //     duration = parseInt(
    //         (365 * 24 * 3600) / ((latestBlock.blockTag - tagBlock) * 13),
    //         10
    //     );
    // }
    // const tag24HoursAgo = {
    //     blockTag: tagBlock,
    // };
    // logger.info(`tagBlock ${tagBlock} duration ${duration}`);
    // const priceOracle24HoursAgo = await getGroPriceFromUniswap(tag24HoursAgo);
    // const poolOneInfo24HoursAgo = await readUniswapPoolWithDecimal(
    //     uniswapGroUsdcPool,
    //     priceOracle24HoursAgo.groPriceInUsd,
    //     ONE,
    //     ONE,
    //     BigNumber.from('1000000'),
    //     tag24HoursAgo
    // );
    // // no balance change
    // if (
    //     poolOneInfo.reserved[0].eq(poolOneInfo24HoursAgo.reserved[0]) &&
    //     poolOneInfo.reserved[1].eq(poolOneInfo24HoursAgo.reserved[1])
    // ) {
    //     poolOneInfo.feeApy = BigNumber.from(0);
    // } else {
    //     poolOneInfo.feeApy = poolOneInfo.lpPrice
    //         .sub(poolOneInfo24HoursAgo.lpPrice)
    //         .mul(ONE)
    //         .div(poolOneInfo24HoursAgo.lpPrice)
    //         .mul(BigNumber.from(duration));
    //     if (poolOneInfo.feeApy.lte(BigNumber.from(0))) {
    //         poolOneInfo.feeApy = BigNumber.from(0);
    //     }
    // }
    // poolOneInfo.feeApy = ZERO;

    const groUsdcFees = await calcFees(
        'uniswap_v2_5050_gro_usdc_2',
        block24hAgo
    );
    const annGroUsdc = groUsdcFees.mul(YEAR).mul(ONE).div(poolOneInfo.tvl);
    poolOneInfo.feeApy = annGroUsdc;
    logger.info(
        `poolOneInfo.feeApy ${poolOneInfo.feeApy}, groUsdcFees: ${groUsdcFees}`
    );

    poolOneInfo.tokenApy = BigNumber.from('0');
    logger.info(
        `currentApy.gvt ${currentApy.gvt} tokenApy ${poolOneInfo.tokenApy}`
    );

    const poolOneStakingInfo = await lpTokenStaker.poolInfo(
        pool2Config.pid,
        latestBlock
    );
    logger.info(
        `groPerBlock ${groPerBlock} poolOneInfo ${poolOneInfo.allocPoint} totalAllocPoint ${totalAllocPoint}`
    );
    if (poolOneInfo.stakedLP.isZero()) {
        poolOneInfo.rewardApy = BigNumber.from(0);
    } else {
        poolOneInfo.rewardApy = groPerBlock
            .mul(priceOracle.groPriceInUsd)
            .mul(BLOCKS_PER_YEAR)
            .mul(poolOneStakingInfo.allocPoint)
            .mul(ONE)
            .div(totalAllocPoint)
            .div(poolOneInfo.stakedLP.mul(poolOneInfo.lpPrice));
    }

    logger.info(`rewardApy ${poolOneInfo.rewardApy}`);
    poolOneInfo.totalApy = poolOneInfo.feeApy
        .add(poolOneInfo.tokenApy)
        .add(poolOneInfo.rewardApy);
    logger.info(`poolOneTotalApy ${poolOneInfo.totalApy}`);
    poolOneInfo.tvlStaked = poolOneInfo.stakedLP
        .mul(poolOneInfo.lpPrice)
        .div(ONE);
    return poolOneInfo;
}

// async function getUniswapPwrd3CrvStats(
//     currentApy,
//     groPerBlock,
//     totalAllocPoint,
//     latestBlock
// ) {
//     // pool-0
//     const priceOracle = await getGroPwrd3crvPriceFromUniswap(latestBlock);
//     const poolOneInfo = await readUniswapPool(
//         uniswapGroPwrd3crvPool,
//         priceOracle.groPriceInUsd,
//         priceOracle.lpPriceInUsd,
//         latestBlock
//     );
//     const startBlock = pool2Config.start_block;
//     let tagBlock = latestBlock.blockTag - 6400;
//     let duration = 365;
//     if (tagBlock < startBlock) {
//         tagBlock = startBlock;
//         duration = parseInt(
//             (365 * 24 * 3600) / ((latestBlock.blockTag - tagBlock) * 13),
//             10
//         );
//     }
//     logger.info(`tagBlock${tagBlock} duration ${duration}`);
//     const tag24HoursAgo = {
//         blockTag: tagBlock,
//     };
//     const priceOracle24HoursAgo = await getGroPwrd3crvPriceFromUniswap(
//         tag24HoursAgo
//     );
//     const poolOneInfo24HoursAgo = await readUniswapPool(
//         uniswapGroPwrd3crvPool,
//         priceOracle24HoursAgo.groPriceInUsd,
//         priceOracle24HoursAgo.lpPriceInUsd,
//         tag24HoursAgo
//     );

//     poolOneInfo.feeApy = poolOneInfo.lpPrice
//         .sub(poolOneInfo24HoursAgo.lpPrice)
//         .mul(ONE)
//         .div(poolOneInfo24HoursAgo.lpPrice)
//         .mul(BigNumber.from(duration));
//     if (poolOneInfo.feeApy.lte(BigNumber.from(0))) {
//         poolOneInfo.feeApy = BigNumber.from(0);
//     }
//     logger.info(`pool gro 3crv.feeApy ${poolOneInfo.feeApy}`);

//     poolOneInfo.tokenApy = currentApy.gvt
//         .mul(GTOKEN_SCALE)
//         .mul(poolOneInfo.reserved[0])
//         .div(poolOneInfo.reserved[0].add(poolOneInfo.reserved[1]));
//     logger.info(
//         `currentApy.gvt ${currentApy.gvt} tokenApy ${poolOneInfo.tokenApy}`
//     );

//     const poolOneStakingInfo = await lpTokenStaker.poolInfo(4, latestBlock);
//     logger.info(
//         `groPerBlock ${groPerBlock} poolOneInfo ${poolOneInfo} totalAllocPoint ${totalAllocPoint}`
//     );
//     if (poolOneInfo.stakedLP.isZero()) {
//         poolOneInfo.rewardApy = BigNumber.from(0);
//     } else {
//         poolOneInfo.rewardApy = groPerBlock
//             .mul(BLOCKS_PER_YEAR)
//             .mul(poolOneStakingInfo.allocPoint)
//             .mul(ONE)
//             .div(totalAllocPoint)
//             .div(poolOneInfo.stakedLP);
//     }

//     logger.info(`rewardApy ${poolOneInfo.rewardApy}`);
//     poolOneInfo.totalApy = poolOneInfo.feeApy
//         .add(poolOneInfo.tokenApy)
//         .add(poolOneInfo.rewardApy);
//     logger.info(`poolOneTotalApy ${poolOneInfo.totalApy}`);
//     return poolOneInfo;
// }

async function getSingleGroStats(
    priceOracle,
    groPerBlock,
    totalAllocPoint,
    latestBlock
) {
    const totalGro = await groToken.totalSupply();
    const singleStaked = await groToken.balanceOf(lpTokenStaker.address);
    logger.info(`stacked single ${singleStaked}`);
    const totalGroTvl = singleStaked.mul(priceOracle.groPriceInUsd).div(ONE);
    logger.info(`totalGroTvl single tvl ${totalGroTvl}`);
    const poolTwoInfo = await lpTokenStaker.poolInfo(
        pool0Config.pid,
        latestBlock
    );
    console.log(`poolTwoInfo.allocPoint ${poolTwoInfo.allocPoint}`);
    let rewardApy = BigNumber.from(0);
    if (!singleStaked.isZero()) {
        rewardApy = groPerBlock
            .mul(priceOracle.groPriceInUsd)
            .mul(BLOCKS_PER_YEAR)
            .mul(poolTwoInfo.allocPoint)
            .mul(ONE)
            .div(totalAllocPoint)
            .div(singleStaked.mul(priceOracle.groPriceInUsd));
    }
    const totalApy = rewardApy;
    logger.info(`totalApy ${totalApy}`);
    const poolInfo = {
        tvl: totalGroTvl,
        stakedLP: singleStaked,
        totalLP: totalGro,
        lpPrice: priceOracle.groPriceInUsd,
        totalApy,
        tokenApy: 0,
        rewardApy,
    };
    return poolInfo;
}

async function getSingleGvtStats(
    priceOracle,
    groPerBlock,
    totalAllocPoint,
    currentApy,
    latestBlock
) {
    const totalGvt = await groVault.totalSupply();
    const singleStaked = await groVault.balanceOf(lpTokenStaker.address);
    logger.info(`stacked single ${singleStaked}`);
    const totalGroTvl = singleStaked.mul(priceOracle.gvtPriceInUsd).div(ONE);
    logger.info(`totalGroTvl single tvl ${totalGroTvl}`);
    const poolTwoInfo = await lpTokenStaker.poolInfo(
        pool3Config.pid,
        latestBlock
    );
    let rewardApy = BigNumber.from(0);
    if (!singleStaked.isZero()) {
        rewardApy = groPerBlock
            .mul(priceOracle.groPriceInUsd)
            .mul(BLOCKS_PER_YEAR)
            .mul(poolTwoInfo.allocPoint)
            .mul(ONE)
            .div(totalAllocPoint)
            .div(singleStaked.mul(priceOracle.gvtPriceInUsd));
    }
    const tokenApy = currentApy.gvt.mul(GTOKEN_SCALE);
    const totalApy = rewardApy.add(tokenApy);
    logger.info(`totalApy ${totalApy}`);
    const poolInfo = {
        tvl: totalGroTvl,
        stakedLP: singleStaked,
        totalLP: totalGvt,
        lpPrice: priceOracle.gvtPriceInUsd,
        totalApy,
        tokenApy,
        rewardApy,
    };
    return poolInfo;
}

async function getCurveLpApy(curvePool, latestBlockTag, startBlock) {
    const currentVirtualPrice = await curvePool.get_virtual_price(
        latestBlockTag
    );
    let blockNumber24Hours = latestBlockTag.blockTag - BLOCKS_PER_DAY;
    logger.info(`blockNumber24Hours : ${blockNumber24Hours}`);
    logger.info(`startBlock : ${startBlock}`);
    if (startBlock && startBlock > blockNumber24Hours) {
        logger.info(
            `startBlock ${startBlock} > blockNumber24Hours ${blockNumber24Hours}`
        );
        blockNumber24Hours = startBlock;
    }
    const virtualPrice24Hours = await curvePool.get_virtual_price({
        blockTag: blockNumber24Hours,
    });

    const dayChange = currentVirtualPrice.sub(virtualPrice24Hours);
    logger.info(`24 hours change : ${dayChange}`);
    const lpTokenApy = dayChange
        .mul(ONE)
        .div(virtualPrice24Hours)
        .mul(BigNumber.from(365));
    logger.info(`one year change : ${lpTokenApy}`);
    return lpTokenApy;
}

async function calculateCurveMetaPoolApy(priceOracle, currentApy, latestBlock) {
    logger.info('start calculateCurveMetaPoolApy');
    // 3crv token's apy
    const crv3Apy = await getCurveLpApy(curve3Pool, latestBlock);
    logger.info(`Crv3Apy Token apy : ${crv3Apy}`);
    const pwrdApy = currentApy.pwrd.mul(GTOKEN_SCALE);
    // pool coins balance
    const metaPool3CrvBalance = await curve3CrvLpToken.balanceOf(
        curvePwrd3crvPool.address
    );
    const metaPoolUPwrdBalance = await groPwrd.balanceOf(
        curvePwrd3crvPool.address
    );
    logger.info(
        `metaPool3CrvBalance balance : ${metaPool3CrvBalance} metaPoolUPwrdBalance ${metaPoolUPwrdBalance}`
    );

    // calculate total asset apy
    const tokenApy = pwrdApy.div(BigNumber.from(2));
    logger.info(`Token apy : ${tokenApy}`);

    // meta pool LP apy
    const metaPoolFirstAddLiquidityBlock = pool4Config.start_block; // TODO
    let poolApy = await getCurveLpApy(
        curvePwrd3crvPool,
        latestBlock,
        metaPoolFirstAddLiquidityBlock
    );
    // Avoid double-counting fees and return 0 if value <0
    poolApy = poolApy.sub(tokenApy);
    if (poolApy.lt(ZERO)) {
        poolApy = ZERO;
    }
    logger.info(`metapoolLPTApy Token apy : ${poolApy}`);

    // reward apy
    const groPerBlock = await lpTokenStaker.groPerBlock();
    const totalAllocPoint = await lpTokenStaker.totalAllocPoint();
    const poolInfo = await lpTokenStaker.poolInfo(pool4Config.pid);
    const stakedAmount = await groPwrdUsdcLpToken.balanceOf(
        lpTokenStaker.address
    );

    // lp price
    const curvePwrd3crvLpPrice = await curvePwrd3crvPool.calc_withdraw_one_coin(
        ONE,
        0,
        latestBlock
    );
    logger.info(`curvePwrd3crvLpPrice price : ${curvePwrd3crvLpPrice}`);

    const poolGroYear = groPerBlock
        .mul(priceOracle.groPriceInUsd)
        .mul(BLOCKS_PER_YEAR)
        .mul(ONE)
        .mul(poolInfo.allocPoint)
        .div(totalAllocPoint);

    logger.info(
        `groPerBlock: ${groPerBlock} priceOracle.groPriceInUsd ${priceOracle.groPriceInUsd} totalAllocPoint: ${totalAllocPoint} poolAllocPoint: ${poolInfo.allocPoint} poolGroYear: ${poolGroYear} ${stakedAmount}`
    );
    const rewardApy = stakedAmount.isZero()
        ? ZERO
        : poolGroYear.div(stakedAmount.mul(curvePwrd3crvLpPrice));
    logger.info(`reward apy : ${rewardApy}`);

    const totalApy = tokenApy.add(poolApy).add(rewardApy);
    logger.info(`Total apy : ${totalApy}`);

    // TVL
    const pwrd3crvLpTotalSupply = await groPwrdUsdcLpToken.totalSupply(
        latestBlock
    );
    logger.info(`pwrd3crvLpTotalSupply : ${pwrd3crvLpTotalSupply}`);
    const tvl = pwrd3crvLpTotalSupply.mul(curvePwrd3crvLpPrice).div(ONE);
    logger.info(`Pool TVL : ${tvl}`);

    const unstaked = pwrd3crvLpTotalSupply.sub(stakedAmount);
    logger.info(
        `staked amount : ${stakedAmount} unstaked amount : ${unstaked}`
    );
    const tvlStaked = stakedAmount.mul(curvePwrd3crvLpPrice).div(ONE);
    const metaPoolInfo = {
        tvl,
        tvlStaked,
        stakedLP: stakedAmount,
        totalLP: pwrd3crvLpTotalSupply,
        lpPrice: curvePwrd3crvLpPrice,
        totalApy,
        tokenApy,
        feeApy: poolApy,
        rewardApy,
        unstaked,
    };
    return metaPoolInfo;
}

/// @notice Calculate pool fees based on annualised 24h volume on fees
/// @dev    Uniswap V2 does not have subgraph for Ropsten => won't return data
/// @param  pool The pool name to calculate fees
/// @param  block24hAgo The block number 24h ago
/// @return fee amount in BigNumber type
const calcFees = async (pool, block24hAgo) => {
    try {
        // Fill in payload for subgraph queries

        const isUniswap =
            pool === 'uniswap_v2_5050_gro_gvt_1' ||
            pool === 'uniswap_v2_5050_gro_usdc_2'
                ? true
                : false;

        const query = isUniswap ? 'uniswapVolume' : 'balancerVolume';

        const url = isUniswap ? sgUniswapURL : sgBalancerURL;

        const poolId =
            pool === 'uniswap_v2_5050_gro_gvt_1'
                ? sgGvtGroPoolId
                : pool === 'uniswap_v2_5050_gro_usdc_2'
                ? sgGroUsdcPoolId
                : pool === 'balancer_v2_8020_gro_weth_5'
                ? sgGroWethPoolId
                : -1;

        if (poolId === -1) {
            logger.error(
                `Error in groTokenHandler.js->calcFees(): Unknown pool`
            );
            return ZERO;
        }

        const payloadNow = {
            query: query,
            url: url,
            id: poolId,
        };

        const payload24h = {
            query: query,
            url: url,
            id: poolId,
            block: block24hAgo,
        };

        // Pull data from subgraphs

        const [volNow, vol24h] = await Promise.all([
            callSubgraph(payloadNow),
            callSubgraph(payload24h),
        ]);

        if (!volNow || !vol24h) return ZERO;

        // Calc volume fees from last 24h

        if (isUniswap) {
            const vNow = parseFloat(volNow.pair.untrackedVolumeUSD);
            const v24h = parseFloat(vol24h.pair.untrackedVolumeUSD);
            const swapFees24h = (vNow - v24h) * UNISWAP_SWAP_FEE;
            logger.info(
                `Fees calc => vol now: ${vNow}, vol 24h: ${v24h}, vol diff: ${
                    vNow - v24h
                }, vol incl. fee: ${swapFees24h}`
            );
            return floatToBN(swapFees24h);
        } else {
            const vNow = parseFloat(volNow.pools[0].totalSwapFee);
            const v24h = parseFloat(vol24h.pools[0].totalSwapFee);
            const swapFees24h = vNow - v24h;
            logger.info(
                `Fees calc => feeVol now: ${vNow}, feeVol 24h: ${v24h}, vol diff: ${
                    vNow - v24h
                }`
            );
            return floatToBN(swapFees24h);
        }
    } catch (err) {
        logger.error(`Error in groTokenHandler.js->calcFees(): ${err}`);
        return ZERO;
    }
};

const getBalancerGroWethStats = async (
    priceOracle,
    groPerBlock,
    totalAllocPoint,
    block24hAgo
) => {
    try {
        let pools;
        let poolShares;
        let stakedSharesBN = ZERO;

        // Avoid returning always 'NA' in test environment
        if (nodeEnv === 'ropsten' || nodeEnv === 'rinkeby')
            return {
                tvl: ZERO,
                tvlStaked: ZERO,
                stakedLP: ZERO,
                totalLP: ZERO,
                lpPrice: ZERO,
                totalApy: ZERO,
                tokenApy: ZERO,
                feeApy: ZERO,
                rewardApy: ZERO,
                unstaked: ZERO,
                poolIncentive: BigNumber.from('139300000000000000'),
            };

        // Pull data from Balancer v2 subgraph
        const payload = {
            query: 'balancerVolume',
            url: sgBalancerURL,
            id: sgGroWethPoolId,
            addr: lpTokenStaker.address.toLowerCase(),
            block: null,
        };

        const res = await callSubgraph(payload);
        if (!res || res.pools.length === 0 || res.poolShares.length === 0) {
            return {
                tvl: 'NA',
                tvlStaked: 'NA',
                stakedLP: 'NA',
                totalLP: 'NA',
                lpPrice: 'NA',
                totalApy: 'NA',
                tokenApy: 'NA',
                feeApy: 'NA',
                rewardApy: 'NA',
                unstaked: 'NA',
                poolIncentive: 'NA',
            };
        } else {
            pools = res.pools[0];
            poolShares = res.poolShares[0];
        }

        // Pull data from Staker
        const poolFiveStakingInfo = await lpTokenStaker.poolInfo(
            pool5Config.pid,
            null
        );

        logger.info('poolFiveStakingInfo', poolFiveStakingInfo);
        logger.info(
            'accGroPerShare',
            poolFiveStakingInfo.accGroPerShare.toString(),
            'allocPoint',
            poolFiveStakingInfo.allocPoint.toString()
        );

        // Calculations
        const tvl = parseFloat(pools.totalLiquidity);
        const totalShares = parseFloat(pools.totalShares);
        const lpPrice = tvl / totalShares;
        const lbPriceBN = floatToBN(lpPrice);
        const tokenApy = ZERO;

        let rewardApy;
        if (!poolShares) {
            rewardApy = ZERO;
        } else {
            stakedSharesBN = floatToBN(poolShares.balance);
            if (stakedSharesBN.lte(ZERO) || lbPriceBN.lte(ZERO)) {
                rewardApy = ZERO;
            } else {
                rewardApy = groPerBlock
                    .mul(priceOracle.groPriceInUsd)
                    .mul(BLOCKS_PER_YEAR)
                    .mul(ONE)
                    .mul(poolFiveStakingInfo.allocPoint)
                    .div(totalAllocPoint)
                    .div(stakedSharesBN.mul(lbPriceBN));
            }
            logger.info(
                `groPerBlock: ${groPerBlock}, blocksPerYear ${BLOCKS_PER_YEAR}`
            );
            logger.info(
                `priceOracle.groPriceInUsd ${priceOracle.groPriceInUsd}`
            );
            logger.info(
                `poolFiveStakingInfo.allocPoint ${poolFiveStakingInfo.allocPoint}`
            );
            logger.info(`totalAllocPoint ${totalAllocPoint}`);
            logger.info(`sharesBN ${stakedSharesBN}`);
            logger.info(`lbPriceBN ${lbPriceBN}`);
        }

        const tvlBN = floatToBN(tvl);
        const tvlStaked = parseFloat(poolShares.balance) * lpPrice;
        const tvlStakedBN = floatToBN(tvlStaked);
        const sharesBN = floatToBN(totalShares);
        const unstaked = sharesBN.gt(ZERO)
            ? sharesBN.sub(stakedSharesBN)
            : ZERO;
        const groWethFees = await calcFees(
            'balancer_v2_8020_gro_weth_5',
            block24hAgo
        );
        const feeApy = groWethFees.mul(YEAR).mul(ONE).div(tvlBN);
        const balPrice = await getCoingeckoPrice('balancer');
        const balRewardPerWeek = BigNumber.from(pool5Config.bal_per_week);
        const balApy = balPrice
            .mul(WEEKS_PER_YEAR)
            .mul(balRewardPerWeek)
            .mul(ONE)
            .div(tvlBN);
        logger.info(`balPrice ${balPrice} balApy ${balApy}`);
        const totalAPY = feeApy.add(tokenApy).add(rewardApy).add(balApy);

        const metaPoolInfo = {
            tvl: tvlBN,
            tvlStaked: tvlStakedBN,
            stakedLP: stakedSharesBN,
            totalLP: sharesBN,
            lpPrice: lbPriceBN,
            totalApy: totalAPY,
            tokenApy: tokenApy,
            feeApy: feeApy,
            rewardApy: rewardApy,
            unstaked: unstaked,
            poolIncentive: balApy,
        };
        return metaPoolInfo;
    } catch (err) {
        logger.error(
            `Error in groTokenHandler.js->getBalancerGroWethStats(): ${err}`
        );
    }
};

async function getPools(currentApy, latestBlock) {
    await initContracts();
    const NAH = 'NA';
    const priceOracle = await getGroPriceFromUniswap(latestBlock);
    // reward in staker per block
    const groPerBlock = await lpTokenStaker.groPerBlock(latestBlock);
    const totalAllocPoint = await lpTokenStaker.totalAllocPoint(latestBlock);
    logger.info(
        `groPerBlock ${groPerBlock} totalAllocPoint ${totalAllocPoint}`
    );
    // Get block number 24h ago
    const block24hAgo = (
        await findBlockByDate(moment.utc().subtract(1, 'day'), true)
    ).block;
    logger.info(`Block number 24h ago: ${block24hAgo}`);

    logger.info(' -- pool0');
    const poolSingleGroStats = await getSingleGroStats(
        priceOracle,
        groPerBlock,
        totalAllocPoint,
        latestBlock
    );
    logger.info(' -- pool1');
    const poolUniswapGroGvtStats = await getUniswapGroGvtStats(
        priceOracle,
        currentApy,
        groPerBlock,
        totalAllocPoint,
        latestBlock,
        block24hAgo
    );
    logger.info(' -- pool2');
    const poolUniswapGroUsdcStats = await getUniswapGroUsdcStats(
        priceOracle,
        currentApy,
        groPerBlock,
        totalAllocPoint,
        latestBlock,
        block24hAgo
    );
    logger.info(' -- pool3');
    const poolSingleGvtStats = await getSingleGvtStats(
        priceOracle,
        groPerBlock,
        totalAllocPoint,
        currentApy,
        latestBlock
    );
    logger.info(' -- pool4');
    const curveMetaStats = await calculateCurveMetaPoolApy(
        priceOracle,
        currentApy,
        latestBlock
    );
    logger.info(' -- pool5');
    const poolBalancerGroWethStats = await getBalancerGroWethStats(
        priceOracle,
        groPerBlock,
        totalAllocPoint,
        block24hAgo
    );

    const pools = [
        {
            deposit_url: pool0Config.deposit_url,
            remove_url: pool0Config.remove_url,
            name: 'single_staking_100_gro_0',
            display_name: 'GRO',
            type: 'ss_1',
            display_type: 'Gro Pool',
            display_order: pool0Config.display_order,
            tokens: ['gro'],
            pid: pool0Config.pid,
            tvl: printUsd(poolSingleGroStats.tvl),
            tvl_staked: printUsd(poolSingleGroStats.tvl),
            staked: poolSingleGroStats.stakedLP.toString(),
            unstaked: poolSingleGroStats.totalLP
                .sub(poolSingleGroStats.stakedLP)
                .toString(),
            required_tokens_num: '1',
            disable: pool0Config.disable,
            lp_usd_price: printUsd(poolSingleGroStats.lpPrice),
            apy: {
                current: {
                    total: printPercent(poolSingleGroStats.totalApy),
                    token: '0.0000',
                    pool_fees: '0.0000',
                    reward: printPercent(poolSingleGroStats.rewardApy),
                },
            },
        },
        {
            deposit_url: pool1Config.deposit_url,
            remove_url: pool1Config.remove_url,
            name: 'uniswap_v2_5050_gro_gvt_1',
            display_name: 'GRO / Vault',
            type: 'uniswap_v2',
            display_type: 'Uniswap v2',
            display_order: pool1Config.display_order,
            tokens: ['gro', 'gvt'],
            pid: pool1Config.pid,
            tvl: printUsd(poolUniswapGroGvtStats.tvl),
            tvl_staked: printUsd(poolUniswapGroGvtStats.tvlStaked),
            staked: poolUniswapGroGvtStats.stakedLP.toString(),
            unstaked: poolUniswapGroGvtStats.totalLP
                .sub(poolUniswapGroGvtStats.stakedLP)
                .toString(),
            required_tokens_num: '2',
            disable: pool1Config.disable,
            lp_usd_price: printUsd(poolUniswapGroGvtStats.lpPrice),
            apy: {
                current: {
                    total: printPercent(poolUniswapGroGvtStats.totalApy),
                    token: printPercent(poolUniswapGroGvtStats.tokenApy),
                    pool_fees: printPercent(poolUniswapGroGvtStats.feeApy),
                    reward: printPercent(poolUniswapGroGvtStats.rewardApy),
                },
            },
        },
        {
            deposit_url: pool2Config.deposit_url,
            remove_url: pool2Config.remove_url,
            name: 'uniswap_v2_5050_gro_usdc_2',
            display_name: 'GRO / USDC',
            type: 'uniswap_v2',
            display_type: 'Uniswap v2',
            display_order: pool2Config.display_order,
            tokens: ['gro', 'usdc'],
            pid: pool2Config.pid,
            tvl: printUsd(poolUniswapGroUsdcStats.tvl),
            tvl_staked: printUsd(poolUniswapGroUsdcStats.tvlStaked),
            staked: poolUniswapGroUsdcStats.stakedLP.toString(),
            unstaked: poolUniswapGroUsdcStats.totalLP
                .sub(poolUniswapGroUsdcStats.stakedLP)
                .toString(),
            required_tokens_num: '2',
            disable: pool2Config.disable,
            lp_usd_price: printUsd(poolUniswapGroUsdcStats.lpPrice),
            apy: {
                current: {
                    total: printPercent(poolUniswapGroUsdcStats.totalApy),
                    token: printPercent(poolUniswapGroUsdcStats.tokenApy),
                    pool_fees: printPercent(poolUniswapGroUsdcStats.feeApy),
                    reward: printPercent(poolUniswapGroUsdcStats.rewardApy),
                },
            },
        },
        {
            deposit_url: pool3Config.deposit_url,
            remove_url: pool3Config.remove_url,
            name: 'single_staking_100_gvt_3',
            display_name: 'Vault',
            type: 'ss_1',
            display_type: 'Vault Pool',
            display_order: pool3Config.display_order,
            tokens: ['gvt'],
            pid: pool3Config.pid,
            tvl: printUsd(poolSingleGvtStats.tvl),
            tvl_staked: printUsd(poolSingleGvtStats.tvl),
            staked: poolSingleGvtStats.stakedLP.toString(),
            unstaked: poolSingleGvtStats.totalLP
                .sub(poolSingleGvtStats.stakedLP)
                .toString(),
            required_tokens_num: '1',
            disable: pool3Config.disable,
            lp_usd_price: printUsd(poolSingleGvtStats.lpPrice),
            apy: {
                current: {
                    total: printPercent(poolSingleGvtStats.totalApy),
                    token: printPercent(poolSingleGvtStats.tokenApy),
                    pool_fees: '0.0000',
                    reward: printPercent(poolSingleGvtStats.rewardApy),
                },
            },
        },
        {
            deposit_url: pool4Config.deposit_url,
            remove_url: pool4Config.remove_url,
            name: 'curve_meta_pwrd_3crv_4',
            display_name: 'PWRD-3CRV',
            type: 'curve_meta',
            display_type: 'Curve Meta',
            display_order: pool4Config.display_order,
            tokens: ['pwrd', 'dai', 'usdc', 'usdt'],
            pid: pool4Config.pid,
            tvl: printUsd(curveMetaStats.tvl),
            tvl_staked: printUsd(curveMetaStats.tvlStaked),
            staked: curveMetaStats.stakedLP.toString(),
            unstaked: curveMetaStats.unstaked.toString(),
            required_tokens_num: '1',
            disable: pool4Config.disable,
            lp_usd_price: printUsd(curveMetaStats.lpPrice),
            apy: {
                current: {
                    total: printPercent(curveMetaStats.totalApy),
                    token: printPercent(curveMetaStats.tokenApy),
                    pool_fees: printPercent(curveMetaStats.feeApy),
                    reward: printPercent(curveMetaStats.rewardApy),
                },
            },
        },
        {
            deposit_url: pool5Config.deposit_url,
            remove_url: pool5Config.remove_url,
            name: 'balancer_v2_8020_gro_weth_5',
            display_name: 'GRO 80% / WETH 20%',
            type: 'balancer_v2',
            display_type: 'Balancer v2',
            display_order: pool5Config.display_order,
            tokens: ['gro', 'weth'],
            pid: pool5Config.pid,
            tvl: isNaN(poolBalancerGroWethStats.tvl)
                ? NAH
                : printUsd(poolBalancerGroWethStats.tvl),
            tvl_staked: isNaN(poolBalancerGroWethStats.tvlStaked)
                ? NAH
                : printUsd(poolBalancerGroWethStats.tvlStaked),
            staked: poolBalancerGroWethStats.stakedLP.toString(),
            unstaked: poolBalancerGroWethStats.unstaked.toString(),
            required_tokens_num: '0',
            disable: pool5Config.disable,
            lp_usd_price: isNaN(poolBalancerGroWethStats.lpPrice)
                ? NAH
                : printUsd(poolBalancerGroWethStats.lpPrice),
            pool_incentive_token: 'bal',
            apy: {
                current: {
                    total: isNaN(poolBalancerGroWethStats.totalApy)
                        ? NAH
                        : printPercent(poolBalancerGroWethStats.totalApy),
                    token: isNaN(poolBalancerGroWethStats.tokenApy)
                        ? NAH
                        : printPercent(poolBalancerGroWethStats.tokenApy),
                    pool_fees: isNaN(poolBalancerGroWethStats.feeApy)
                        ? NAH
                        : printPercent(poolBalancerGroWethStats.feeApy),
                    reward: isNaN(poolBalancerGroWethStats.rewardApy)
                        ? NAH
                        : printPercent(poolBalancerGroWethStats.rewardApy),
                    pool_incentive: isNaN(
                        poolBalancerGroWethStats.poolIncentive
                    )
                        ? NAH
                        : printPercent(poolBalancerGroWethStats.poolIncentive),
                },
            },
        },
    ];
    const tokenPriceUsd = {
        pwrd: '1.0000000',
        gvt: printUsd(priceOracle.gvtPriceInUsd),
        gro: printUsd(priceOracle.groPriceInUsd),
    };
    return { pools, tokenPriceUsd };
}

async function getLpTokenAmountOfBalancerPool(address) {
    const balancer = await getLatestSystemContract(
        ContractNames.BalancerWeightedPool
    ).contract;
    const lpAmount = await balancer.balanceOf(address);
    return lpAmount;
}

module.exports = {
    getGroPriceFromUniswap,
    getPools,
    getLpTokenAmountOfBalancerPool,
};
