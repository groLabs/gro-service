const { BigNumber: BN } = require('bignumber.js');
const mapObject = require('map-obj');
const { ethers, BigNumber } = require('ethers');
const config = require('config');
const { getLatestSystemContract } = require('../common/contractStorage');
const { ContractNames } = require('../../dist/registry/registry');
const logger = require('../statsLogger');

const Curve3PoolABI = require('../../abi/ICurve3Pool.json');

const PERCENT_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const USD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(7));
const USDC_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const DAI_DECIMAL = BigNumber.from(10).pow(BigNumber.from(18));
const STABLECION_DECIMALS = [DAI_DECIMAL, USDC_DECIMAL, USDC_DECIMAL];
const FIXED_USD = 7;
const FIXED_PERCENT = 2;
const USD_DECIAML_BN = BN(10).pow(BN(7));
const buoyStartBlock = parseInt(config.get('buoy_start_block'), 10);

function printUsd(value) {
    return BN(value.toString())
        .div(USD_DECIAML_BN)
        .toFixed(FIXED_USD)
        .toString();
}

function printPercent(value) {
    return BN(value.toString()).div(BN(100)).toFixed(FIXED_PERCENT).toString();
}

function mapperToUsd(original, keys) {
    return mapObject(
        original,
        (key, value) => {
            let result = [key, value];
            if (keys.length > 0 && keys.includes(key)) {
                result = [key, printUsd(value)];
            }
            return result;
        },
        { deep: true }
    );
}

function mapperToString(original, keys) {
    return mapObject(
        original,
        (key, value) => {
            let result = [key, value];
            if (keys.length > 0 && keys.includes(key)) {
                result = [key, printPercent(value)];
            }
            return result;
        },
        { deep: true }
    );
}

async function getCurvePoolRatio(curvePool, blockTag) {
    const rawRatio = [DAI_DECIMAL];
    for (let i = 1; i < 3; i += 1) {
        const ratio = await curvePool.get_dy(
            0,
            i,
            STABLECION_DECIMALS[0],
            blockTag
        );
        logger.info(`curve pool ratio ${i} ${ratio}`);
        rawRatio[i] = ratio;
    }
    const ratios = {};
    // dai/usdc
    ratios.dai_usdc = rawRatio[1].mul(USD_DECIMAL).div(USDC_DECIMAL);
    // dai/usdt
    ratios.dai_usdt = rawRatio[2].mul(USD_DECIMAL).div(USDC_DECIMAL);
    // usdt/usdc
    ratios.usdt_usdc = rawRatio[1].mul(USD_DECIMAL).div(rawRatio[2]);
    logger.info(
        `curve pool ratios ${ratios.dai_usdc} ${ratios.dai_usdt} ${ratios.usdt_usdc}`
    );
    const usdc_usdt = await curvePool.get_dy(
        1,
        2,
        STABLECION_DECIMALS[2],
        blockTag
    );
    const usdt_usdc = await curvePool.get_dy(
        2,
        1,
        STABLECION_DECIMALS[2],
        blockTag
    );
    logger.info(`ref usdc_usdt ${usdc_usdt} usdt_usdc ${usdt_usdc}`);

    return ratios;
}

async function getChainlinkPrice(buoyInstance, blockTag) {
    const price0 = await buoyInstance.getPriceFeed(0, blockTag);
    const price1 = await buoyInstance.getPriceFeed(1, blockTag);
    const price2 = await buoyInstance.getPriceFeed(2, blockTag);
    logger.info(`pricefeed ${price0} ${price1} ${price2}`);
    const ratios = {};
    // dai/usdc
    ratios.dai_usdc = price0.mul(USD_DECIMAL).div(price1);
    // dai/usdt
    ratios.dai_usdt = price0.mul(USD_DECIMAL).div(price2);
    // usdt/usdc
    ratios.usdt_usdc = price2.mul(USD_DECIMAL).div(price1);
    logger.info(
        `ratios ${ratios.dai_usdc} ${ratios.dai_usdt} ${ratios.usdt_usdc}`
    );
    return ratios;
}

async function getBouyLastRatio(buoyInstance, blockTag) {
    const rawRatio = [];
    for (let i = 0; i < 3; i += 1) {
        const ratio = await buoyInstance.lastRatio(i, blockTag);
        logger.info(`cache ratio ${i} ${ratio}`);
        rawRatio[i] = ratio;
    }
    const ratios = {};
    // dai/usdc
    ratios.dai_usdc = rawRatio[0].mul(USD_DECIMAL).div(USDC_DECIMAL);
    // dai/usdt
    ratios.dai_usdt = rawRatio[1].mul(USD_DECIMAL).div(USDC_DECIMAL);
    // usdt/usdc
    ratios.usdt_usdc = rawRatio[0].mul(USD_DECIMAL).div(rawRatio[1]);
    logger.info(
        `cache ratios ${ratios.dai_usdc} ${ratios.dai_usdt} ${ratios.usdt_usdc}`
    );
    return ratios;
}

function compareCurveToRef(curve, ref) {
    const diff = {};
    // dai/usdc
    diff.dai_usdc = curve.dai_usdc
        .sub(ref.dai_usdc)
        .abs()
        .mul(PERCENT_DECIMAL)
        .div(ref.dai_usdc);
    // dai/usdt
    diff.dai_usdt = curve.dai_usdt
        .sub(ref.dai_usdt)
        .abs()
        .mul(PERCENT_DECIMAL)
        .div(ref.dai_usdt);
    // usdt/usdc
    diff.usdt_usdc = curve.usdt_usdc
        .sub(ref.usdt_usdc)
        .abs()
        .mul(PERCENT_DECIMAL)
        .div(ref.usdt_usdc);

    logger.info(`ref diff ${diff.dai_usdc} ${diff.dai_usdt} ${diff.usdt_usdc}`);
    return diff;
}

function checkTolerance(diff, tolerance) {
    const adjustedTolerance = tolerance;
    const check = {};
    // dai/usdc
    check.dai_usdc = diff.dai_usdc.lte(adjustedTolerance);
    // dai/usdt
    check.dai_usdt = diff.dai_usdt.lte(adjustedTolerance);
    // usdt/usdc
    check.usdt_usdc = diff.usdt_usdc.lte(adjustedTolerance);
    logger.info(
        `ref check ${check.dai_usdc} ${check.dai_usdt} ${check.usdt_usdc}`
    );
    return check;
}

function isValidBlockNumber(blockNumberStr) {
    if (blockNumberStr === 'latest') {
        return true;
    }
    const blockNumber = parseInt(blockNumberStr, 10);
    if (blockNumber < buoyStartBlock) {
        return false;
    }
    return true;
}

function getBuoyStartBlock() {
    return buoyStartBlock;
}

async function getGroPrice(blockNumberStr) {
    const providerKey = 'default';
    const buoyInstance = getLatestSystemContract(
        ContractNames.buoy3Pool,
        providerKey
    ).contract;
    let blockNumber;
    if (blockNumberStr === 'latest') {
        blockNumber = await buoyInstance.provider.getBlockNumber();
    } else {
        blockNumber = parseInt(blockNumberStr, 10);
    }
    logger.info(`get gro price blockNumber ${blockNumber}`);
    const blockTag = { blockTag: blockNumber };

    const safetyCheck = await buoyInstance.safetyCheck(blockTag);
    logger.info(`safetyCheck ${safetyCheck}`);
    const oracleCheckTolerance = await buoyInstance.oracle_check_tolerance(
        blockTag
    );
    let curveCheckTolerance = oracleCheckTolerance;
    try {
        curveCheckTolerance = await buoyInstance.curve_check_tolerance(
            blockTag
        );
    } catch (e) {
        logger.info(`${e}`);
    }
    logger.info(`oracleCheckTolerance ${oracleCheckTolerance}`);
    const curvePoolAddr = await buoyInstance.curvePool();
    logger.info(`curvePoolAddr ${curvePoolAddr}`);
    // const nonceManager = getWalletNonceManager(providerKey, walletKey);
    const curvePool = new ethers.Contract(
        curvePoolAddr,
        Curve3PoolABI,
        buoyInstance.provider
    );
    const curve = await getCurvePoolRatio(curvePool, blockTag);
    const groCache = await getBouyLastRatio(buoyInstance, blockTag);
    const chainlink = await getChainlinkPrice(buoyInstance, blockTag);
    const curveVsCache = compareCurveToRef(curve, groCache);
    const curveVsChainlink = compareCurveToRef(curve, chainlink);
    const curveVsCacheCheck = checkTolerance(
        curveVsCache,
        oracleCheckTolerance
    );
    const curveVsChainlinkCheck = checkTolerance(
        curveVsChainlink,
        oracleCheckTolerance
    );
    const mappingKeys = ['dai_usdc', 'dai_usdt', 'usdt_usdc'];
    const pricing = {
        curve: mapperToUsd(curve, mappingKeys),
        gro_cache: mapperToUsd(groCache, mappingKeys),
        chainlink: mapperToUsd(chainlink, mappingKeys),
        curve_cache_diff: mapperToString(curveVsCache, mappingKeys),
        curve_chainlink_diff: mapperToString(curveVsChainlink, mappingKeys),
        curve_cache_check: curveVsCacheCheck,
        curve_chainlink_check: curveVsChainlinkCheck,
        safety_check_bound: oracleCheckTolerance.toString(),
        safety_check: safetyCheck,
        block_number: blockNumber.toString(),
        curve_check_tolerance: curveCheckTolerance.toString(),
        oracle_check_tolerance: oracleCheckTolerance.toString(),
    };
    return pricing;
}

module.exports = {
    getGroPrice,
    isValidBlockNumber,
    getBuoyStartBlock,
};
