'use strict';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { BigNumber } = require('ethers');

dayjs.extend(utc);
const { getGvt, getPwrd } = require('../../contract/allContracts');
const BlocksScanner = require('../common/blockScanner');
const logger = require('../statsLogger');
const { getDefaultProvider } = require('../../common/chainUtil');
const { BlockChainCallError } = require('../../common/customErrors');
const config = require('config');
const provider = getDefaultProvider();
const scanner = new BlocksScanner(provider);

const FACTOR_DECIMAL = BigNumber.from(10).pow(BigNumber.from(18));
const GVT_INIT_FACTOR = BigNumber.from('3333333333333333');
const PERCENT_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);
const SECONDS_IN_YEAR = BigNumber.from(31536000);
const DAYS_IN_YEAR = BigNumber.from(365);
const WEEKS_IN_YEAR = BigNumber.from(52);
const MONTHS_IN_YEAR = BigNumber.from(12);

// config
const launchTimestamp = config.get('blockchain.launch_timestamp');
const launchDate = dayjs.unix(launchTimestamp);

const calcApyByPeriod = async function (
    startDate,
    currentGvtFactor,
    currentPwrdFactor,
    multiplier,
    defaultAPY
) {
    if (startDate.isBefore(launchDate)) {
        return defaultAPY;
    }
    const startBlock = await scanner
        .getDate(startDate.toDate())
        .catch((error) => {
            logger.error(`Could not get block ${startDate}`);
        });
    logger.info(`${startDate.toDate()}`);
    const startBlockTag = {
        blockTag: startBlock.block,
    };
    const startGvtFactor = await getGvt().factor(startBlockTag);
    const startPwrdFactor = await getPwrd().factor(startBlockTag);

    const gvtApy = calculatePriceDiff(startGvtFactor, currentGvtFactor).mul(
        multiplier
    );

    const pwrdApy = calculatePriceDiff(startPwrdFactor, currentPwrdFactor).mul(
        multiplier
    );

    logger.info(
        `block ${startBlock.block} ${currentGvtFactor} ${currentPwrdFactor} factor gvt ${startGvtFactor} ${gvtApy} pwrd ${startPwrdFactor} ${pwrdApy}`
    );
    return {
        pwrd: pwrdApy,
        gvt: gvtApy,
    };
};

const calculatePriceDiff = function (factorStart, factorEnd) {
    const startPrice = FACTOR_DECIMAL.mul(PERCENT_DECIMAL).div(factorStart);
    const endPrice = FACTOR_DECIMAL.mul(PERCENT_DECIMAL).div(factorEnd);
    if(startPrice.toString() == '0') {
        throw new BlockChainCallError('calculatePriceDiff failed: startPrice is 0.')
    }
    return endPrice.sub(startPrice).mul(PERCENT_DECIMAL).div(startPrice);
};

// In effect if start timestamp of "the period"  < launch_timestamp then just use all time apy. // // Where "the_period" is 24h/daily/weekly/monthly
const calcFirstDayApy = async function (latestBlock) {
    logger.info(
        `calculate first day apy ${latestBlock.timestamp} ${launchTimestamp}`
    );
    // TODO compare now and launchDate and duration zero check
    const duration = BigNumber.from(latestBlock.timestamp).sub(
        BigNumber.from(launchTimestamp)
    );
    logger.info(`duration ${duration}`);
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };

    const gvtFactorNow = await getGvt().factor(latestBlockTag);
    const pwrdFactorNow = await getPwrd().factor(latestBlockTag);
    const gvtApy = calculatePriceDiff(GVT_INIT_FACTOR, gvtFactorNow)
        .mul(SECONDS_IN_YEAR)
        .div(duration);

    const pwrdApy = calculatePriceDiff(FACTOR_DECIMAL, pwrdFactorNow)
        .mul(SECONDS_IN_YEAR)
        .div(duration);

    const firstDayApy = {
        pwrd: pwrdApy,
        gvt: gvtApy,
    };
    logger.info(
        `block ${latestBlock.number} now factor: ${gvtFactorNow} ${pwrdFactorNow} factor gvt ${GVT_INIT_FACTOR} ${gvtApy} pwrd ${FACTOR_DECIMAL} ${pwrdApy}`
    );
    return firstDayApy;
};

const calcAlltimeApy = async function (startOfToday) {
    logger.info(`calculate alltime apy ${startOfToday}`);

    const gvt = getGvt();
    const pwrd = getPwrd();

    const blockUtcToday = await scanner
        .getDate(startOfToday.toDate())
        .catch((error) => {
            logger.error(`Could not get block ${startOfToday}`);
        });
    const blockTagUtcToday = {
        blockTag: blockUtcToday.block,
    };
    logger.info(
        `UTCTODAY block ${blockUtcToday.block}, ${blockUtcToday.timestamp}`
    );
    const duration = BigNumber.from(blockUtcToday.timestamp).sub(
        BigNumber.from(launchTimestamp)
    );
    logger.info(`startOfToday ${startOfToday}`);
    logger.info(`duration ${duration}`);

    const gvtFactorEnd = await gvt.factor(blockTagUtcToday);
    const pwrdFactorEnd = await pwrd.factor(blockTagUtcToday);

    const gvtApy = calculatePriceDiff(GVT_INIT_FACTOR, gvtFactorEnd)
        .mul(SECONDS_IN_YEAR)
        .div(duration);

    const pwrdApy = calculatePriceDiff(FACTOR_DECIMAL, pwrdFactorEnd)
        .mul(SECONDS_IN_YEAR)
        .div(duration);

    const allTimeApy = {
        pwrd: pwrdApy,
        gvt: gvtApy,
    };
    logger.info(
        `alltime block ${blockUtcToday.block} ${gvtFactorEnd} ${pwrdFactorEnd} factor gvt ${GVT_INIT_FACTOR} ${gvtApy} pwrd ${FACTOR_DECIMAL} ${pwrdApy}`
    );
    return allTimeApy;
};

const getSystemApy = async function (latestBlock) {
    logger.info('SystemApy');
    const gvt = getGvt();
    const pwrd = getPwrd();

    // capture the blocknumber
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };
    const startOfUTCToday = dayjs
        .unix(latestBlock.timestamp)
        .utc()
        .startOf('day');
    logger.info(`startOfUTCToday ${startOfUTCToday}`);
    const allTimeApy = startOfUTCToday.isBefore(launchDate)
        ? await calcFirstDayApy(latestBlock)
        : await calcAlltimeApy(startOfUTCToday);

    // last 24h
    const apyLast24h = await calcApyByPeriod(
        dayjs.unix(latestBlock.timestamp).subtract(1, 'day'),
        await gvt.factor(latestBlockTag),
        await pwrd.factor(latestBlockTag),
        DAYS_IN_YEAR,
        allTimeApy
    );

    let blockUtcToday = await scanner
        .getDate(startOfUTCToday)
        .catch((error) => {
            logger.error(`Could not get block ${startOfUTCToday}`);
        });
    const blockTagUtcToday = {
        blockTag: blockUtcToday.number,
    };

    const gvtFactorUtcToday = await gvt.factor(blockTagUtcToday);
    const pwrdFactorUtcToday = await pwrd.factor(blockTagUtcToday);

    // one monthly
    logger.info('----monthly');
    const apyMonthly = await calcApyByPeriod(
        startOfUTCToday.subtract(1, 'month'),
        gvtFactorUtcToday,
        pwrdFactorUtcToday,
        MONTHS_IN_YEAR,
        allTimeApy
    );

    // one week
    logger.info('----weekly');
    const apyWeekly = await calcApyByPeriod(
        startOfUTCToday.subtract(1, 'week'),
        gvtFactorUtcToday,
        pwrdFactorUtcToday,
        WEEKS_IN_YEAR,
        allTimeApy
    );

    // one day
    logger.info('----daily');
    const apyDaily = await calcApyByPeriod(
        startOfUTCToday.subtract(1, 'day'),
        gvtFactorUtcToday,
        pwrdFactorUtcToday,
        DAYS_IN_YEAR,
        allTimeApy
    );

    const apy = {
        last24h: apyLast24h,
        daily: apyDaily,
        weekly: apyWeekly,
        monthly: apyMonthly,
        all_time: allTimeApy,
    };

    return apy;
};

module.exports = {
    getSystemApy,
};
