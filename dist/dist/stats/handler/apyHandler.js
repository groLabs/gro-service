const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { BigNumber } = require('ethers');
dayjs.extend(utc);
const BlocksScanner = require('../common/blockscanner');
const logger = require('../statsLogger');
const { getTimestampByBlockNumber } = require('../../dist/common/chainUtil');
const { BlockChainCallError } = require('../../dist/common/error');
const { getConfig } = require('../../dist/common/configUtil');
const { getLatestSystemContract } = require('../common/contractStorage');
const { ContractNames } = require('../../registry/registry');
const FACTOR_DECIMAL = BigNumber.from(10).pow(BigNumber.from(18));
const PERCENT_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const SECONDS_IN_YEAR = BigNumber.from(31536000);
const DAYS_IN_YEAR = BigNumber.from(365);
const WEEKS_IN_YEAR = BigNumber.from(52);
const MONTHS_IN_YEAR = BigNumber.from(12);
const providerKey = 'stats_gro';
// config
const launchBlock = getConfig('blockchain.start_block');
let scanner;
function updateBlocksScanner(newProvider) {
    scanner = new BlocksScanner(newProvider);
}
function getLatestPowerD() {
    return getLatestSystemContract(ContractNames.powerD, providerKey).contract;
}
function getLatestGroVault() {
    return getLatestSystemContract(ContractNames.groVault, providerKey)
        .contract;
}
function calculatePriceDiff(factorStart, factorEnd) {
    const startPrice = FACTOR_DECIMAL.mul(PERCENT_DECIMAL).div(factorStart);
    const endPrice = FACTOR_DECIMAL.mul(PERCENT_DECIMAL).div(factorEnd);
    if (startPrice.toString() === '0') {
        throw new BlockChainCallError('calculatePriceDiff failed: startPrice is 0.');
    }
    return endPrice.sub(startPrice).mul(PERCENT_DECIMAL).div(startPrice);
}
async function getGTokenBaseFactor(isPWRD) {
    let token;
    if (isPWRD) {
        token = getLatestPowerD();
    }
    else {
        token = getLatestGroVault();
    }
    const factor = await token
        .factor({ blockTag: launchBlock })
        .catch((error) => {
        logger.error(error);
        throw new BlockChainCallError(`Get base factor for ${isPWRD ? 'PWRD' : 'Vault'} failed`);
    });
    return BigNumber.from(factor.toString());
}
async function findBlockByDate(scanDate, after = true) {
    const blockFound = await scanner
        .getDate(scanDate.toDate(), after)
        .catch((error) => {
        logger.error(error);
        logger.error(`Could not get block ${scanDate}`);
    });
    logger.info(`scanDate ${scanDate} block ${blockFound.block}`);
    return blockFound;
}
async function calcApyByPeriod(startDate, currentGvtFactor, currentPwrdFactor, multiplier) {
    const startBlock = await findBlockByDate(startDate);
    const startBlockTag = {
        blockTag: startBlock.block,
    };
    const startGvtFactor = await getLatestGroVault().factor(startBlockTag);
    const startPwrdFactor = await getLatestPowerD().factor(startBlockTag);
    const gvtApy = calculatePriceDiff(startGvtFactor, currentGvtFactor).mul(multiplier);
    const pwrdApy = calculatePriceDiff(startPwrdFactor, currentPwrdFactor).mul(multiplier);
    logger.info(`calcApyByPeriod block ${startBlock.block} ${currentGvtFactor} ${currentPwrdFactor} factor gvt ${startGvtFactor} ${gvtApy} pwrd ${startPwrdFactor} ${pwrdApy}`);
    return {
        pwrd: pwrdApy,
        gvt: gvtApy,
    };
}
// In effect if start timestamp of "the period"  < launch_timestamp then just use all time apy.
// Where "the_period" is 24h/daily/weekly/monthly
async function calcApyOfInitDays(latestBlock, launchTimestamp) {
    logger.info(`calculate apy of init days ${latestBlock.timestamp} ${launchTimestamp}`);
    // TODO compare now and launchDate and duration zero check
    const duration = BigNumber.from(latestBlock.timestamp).sub(BigNumber.from(launchTimestamp));
    logger.info(`duration ${duration}`);
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };
    const gvtFactorNow = await getLatestGroVault().factor(latestBlockTag);
    const pwrdFactorNow = await getLatestPowerD().factor(latestBlockTag);
    const gvtFactor = await getGTokenBaseFactor(false);
    const pwrdFactor = await getGTokenBaseFactor(true);
    const gvtApy = calculatePriceDiff(gvtFactor, gvtFactorNow)
        .mul(SECONDS_IN_YEAR)
        .div(duration);
    const pwrdApy = calculatePriceDiff(pwrdFactor, pwrdFactorNow)
        .mul(SECONDS_IN_YEAR)
        .div(duration);
    const apyInitDays = {
        pwrd: pwrdApy,
        gvt: gvtApy,
    };
    logger.info(`calcApyOfInitDays block ${latestBlock.number} now factor: ${gvtFactorNow} ${pwrdFactorNow} factor gvt ${gvtFactor} ${gvtApy} pwrd ${pwrdFactor} ${pwrdApy}`);
    return apyInitDays;
}
async function calcAlltimeApy(startOfToday, launchTimestamp) {
    logger.info(`calculate alltime apy ${startOfToday}`);
    const gvt = getLatestGroVault();
    const pwrd = getLatestPowerD();
    const blockUtcToday = await findBlockByDate(startOfToday);
    const blockTagUtcToday = {
        blockTag: blockUtcToday.block,
    };
    logger.info(`UTCTODAY block ${blockUtcToday.block}, ${blockUtcToday.timestamp}`);
    const duration = BigNumber.from(blockUtcToday.timestamp).sub(BigNumber.from(launchTimestamp));
    logger.info(`startOfToday ${startOfToday} duration ${duration}`);
    const gvtFactorEnd = await gvt.factor(blockTagUtcToday);
    const pwrdFactorEnd = await pwrd.factor(blockTagUtcToday);
    const gvtFactor = await getGTokenBaseFactor(false);
    const pwrdFactor = await getGTokenBaseFactor(true);
    const gvtApy = calculatePriceDiff(gvtFactor, gvtFactorEnd)
        .mul(SECONDS_IN_YEAR)
        .div(duration);
    const pwrdApy = calculatePriceDiff(pwrdFactor, pwrdFactorEnd)
        .mul(SECONDS_IN_YEAR)
        .div(duration);
    const allTimeApy = {
        pwrd: pwrdApy,
        gvt: gvtApy,
    };
    logger.info(`alltime block ${blockUtcToday.block} ${gvtFactorEnd} ${pwrdFactorEnd} factor gvt ${gvtFactor} ${gvtApy} pwrd ${pwrdFactor} ${pwrdApy}`);
    return allTimeApy;
}
async function getSystemApy(latestBlock, provider) {
    updateBlocksScanner(provider);
    logger.info('SystemApy');
    const gvt = getLatestGroVault();
    const pwrd = getLatestPowerD();
    const startOfUTCToday = dayjs
        .unix(latestBlock.timestamp)
        .utc()
        .startOf('day');
    logger.info(`startOfUTCToday ${startOfUTCToday}`);
    const launchTimestamp = await getTimestampByBlockNumber(launchBlock, provider);
    const launchDate = dayjs.unix(launchTimestamp);
    // In first day, all the apy is the same as all_time
    if (startOfUTCToday.isBefore(launchDate)) {
        logger.info(`calculate first day apy ${startOfUTCToday} is before ${launchDate}`);
        const apyInFirstDay = await calcApyOfInitDays(latestBlock, launchTimestamp);
        return {
            last24h: apyInFirstDay,
            last7d: apyInFirstDay,
            daily: apyInFirstDay,
            weekly: apyInFirstDay,
            monthly: apyInFirstDay,
            all_time: apyInFirstDay,
        };
    }
    // in the beginning time, the apy are the same as allTimeApy
    const allTimeApy = await calcAlltimeApy(startOfUTCToday, launchTimestamp);
    let apyMonthly = allTimeApy;
    let apyWeekly = allTimeApy;
    let apyDaily = allTimeApy;
    // last 24h and 7d apy uses shifting window
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };
    const latestGvtFactor = await gvt.factor(latestBlockTag);
    const latestPwrdFactor = await pwrd.factor(latestBlockTag);
    // last 24h
    logger.info('----last 24h');
    const last24hAgo = dayjs.unix(latestBlock.timestamp).subtract(1, 'day');
    let apyLast24h;
    if (last24hAgo.isBefore(launchDate)) {
        apyLast24h = await calcApyOfInitDays(latestBlock, launchTimestamp);
    }
    else {
        apyLast24h = await calcApyByPeriod(last24hAgo, latestGvtFactor, latestPwrdFactor, DAYS_IN_YEAR);
    }
    // last 7d
    logger.info('----last 7d');
    const startOf7DaysAgo = dayjs
        .unix(latestBlock.timestamp)
        .subtract(7, 'day');
    let apyLast7d;
    if (startOf7DaysAgo.isBefore(launchDate)) {
        apyLast7d = await calcApyOfInitDays(latestBlock, launchTimestamp);
    }
    else {
        apyLast7d = await calcApyByPeriod(startOf7DaysAgo, latestGvtFactor, latestPwrdFactor, WEEKS_IN_YEAR);
    }
    // monthly, weekly, daily are based on utc
    const blockUtcToday = await findBlockByDate(startOfUTCToday);
    const blockTagUtcToday = {
        blockTag: blockUtcToday.block,
    };
    const gvtFactorUtcToday = await gvt.factor(blockTagUtcToday);
    logger.info(`gvtf ${gvtFactorUtcToday}`);
    const pwrdFactorUtcToday = await pwrd.factor(blockTagUtcToday);
    logger.info(`pwrdF ${pwrdFactorUtcToday}`);
    // one monthly
    logger.info('----monthly');
    const oneMonthAgo = startOfUTCToday.subtract(1, 'month');
    if (oneMonthAgo.isAfter(launchDate)) {
        apyMonthly = await calcApyByPeriod(oneMonthAgo, gvtFactorUtcToday, pwrdFactorUtcToday, MONTHS_IN_YEAR);
    }
    // one week
    logger.info('----weekly');
    const oneWeekAgo = startOfUTCToday.subtract(1, 'week');
    if (oneWeekAgo.isAfter(launchDate)) {
        apyWeekly = await calcApyByPeriod(oneWeekAgo, gvtFactorUtcToday, pwrdFactorUtcToday, WEEKS_IN_YEAR);
    }
    // one day
    logger.info('----daily');
    const oneDayAgo = startOfUTCToday.subtract(1, 'day');
    if (oneDayAgo.isAfter(launchDate)) {
        apyDaily = await calcApyByPeriod(oneDayAgo, gvtFactorUtcToday, pwrdFactorUtcToday, DAYS_IN_YEAR);
    }
    const apy = {
        last24h: apyLast24h,
        last7d: apyLast7d,
        daily: apyDaily,
        weekly: apyWeekly,
        monthly: apyMonthly,
        all_time: allTimeApy,
    };
    return apy;
}
async function getHistoricalSystemApy(block, provider) {
    updateBlocksScanner(provider);
    logger.info('HistoricalSystemApy');
    const gvt = getGvt(providerKey);
    const pwrd = getPwrd(providerKey);
    const launchTimestamp = await getTimestampByBlockNumber(launchBlock, provider);
    const launchDate = dayjs.unix(launchTimestamp);
    // last 24h and 7d apy uses shifting window
    const endBlockTag = {
        blockTag: block.number,
    };
    const latestGvtFactor = await gvt.factor(endBlockTag);
    const latestPwrdFactor = await pwrd.factor(endBlockTag);
    // last 7d
    logger.info('----last 7d');
    const startOf7DaysAgo = dayjs.unix(block.timestamp).subtract(7, 'day');
    let apyLast7d;
    if (startOf7DaysAgo.isBefore(launchDate)) {
        apyLast7d = await calcApyOfInitDays(block, launchTimestamp);
    }
    else {
        apyLast7d = await calcApyByPeriod(startOf7DaysAgo, latestGvtFactor, latestPwrdFactor, WEEKS_IN_YEAR);
    }
    logger.info(`Historical last 7d ${block.number} ${apyLast7d.pwrd} ${apyLast7d.gvt}`);
    const apy = {
        last7d: apyLast7d,
    };
    return apy;
}
module.exports = {
    getSystemApy,
    getHistoricalSystemApy,
};
