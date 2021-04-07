'use strict';

const { BigNumber: BN } = require('bignumber.js');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const {
    getGvt,
    getPwrd,
    getInsurance,
    getExposure,
    getLifeguard,
    getVaults,
    getStrategyLength,
    getDepositHandler,
    getWithdrawHandler,
    getBuoy,
} = require('../../contract/allContracts');
const BlocksSanner = require('../common/blockscanner');
const logger = require('../statsLogger');
const { getDefaultProvider } = require('../../common/chainUtil');
const config = require('config');
const {
    sendMessage,
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
} = require('../../common/discord/discordService');
const provider = getDefaultProvider();
const scanner = new BlocksSanner(getDefaultProvider());

const USD_DECIMAL = new BN(10).pow(new BN(18));
const PERCENT_DECIMAL = new BN(10).pow(new BN(4));
const FIXED_PERCENT = 4;
const FIXED_USD = 7;
// config
const vaultNames = config.get('vault_name');
const strategyNames = config.get('strategy_name');
const lifeguardNames = config.get('lifeguard_name');
const launchTimestamp = config.get('blockchain.launch_timestamp');
const launchDate = dayjs.unix(launchTimestamp);
const statsDir = config.get('stats_folder');
const statsLatest = config.get('stats_latest');

const miniSecondsInYear = new BN(31536000000);
const dailyApyMultiplier = new BN(365);
const weeklyApyMultiplier = new BN(52);
const monthlyApyMultiplier = new BN(12);

const convertToBN = function (bigNumber) {
    return new BN(bigNumber.toString());
};

const printUsdValue = function (value) {
    return value.dividedBy(USD_DECIMAL).toFixed(FIXED_USD).toString();
};

const printPercentValue = function (value) {
    return value.toFixed(FIXED_PERCENT).toString();
};

const getUsdValue = async function (i, amount, latestBlockTag) {
    const usdValue = await getBuoy().singleStableToUsd(
        amount,
        i,
        latestBlockTag
    );
    return convertToBN(usdValue);
};

const getVaultAndStrategies = async function (
    total,
    vault,
    index,
    length,
    latestBlockTag
) {
    let promisesStrategy = [];
    let vaultTotalAsset = await vault.totalAssets(latestBlockTag);
    let assetUsd = await getUsdValue(index, vaultTotalAsset, latestBlockTag);
    for (let j = 0; j < length; j++) {
        promisesStrategy.push(
            vault
                .getStrategyAssets(j, latestBlockTag)
                .then(async (resolve, reject) => {
                    return {
                        assetUsd: await getUsdValue(
                            index,
                            resolve,
                            latestBlockTag
                        ),
                        name: strategyNames[j],
                    };
                })
        );
    }
    let strategies = await Promise.all(promisesStrategy);
    let assetsInVault = assetUsd;
    let strategyStats = strategies.map((strategy) => {
        assetsInVault = assetsInVault.minus(strategy.assetUsd);
        return {
            name: strategy.name,
            amount: printUsdValue(strategy.assetUsd),
            share: printPercentValue(strategy.assetUsd.dividedBy(total)),
        };
    });
    strategyStats.push({
        name: vaultNames[index],
        amount: printUsdValue(assetsInVault),
        share: printPercentValue(assetsInVault.dividedBy(total)),
    });
    return {
        stablecoin: vaultNames[index],
        amount: printUsdValue(assetUsd),
        share: printPercentValue(assetUsd.dividedBy(total)),
        strategies: strategyStats,
    };
};

const calcApyByPeriod = async function (
    cutoff,
    currentGvtFactor,
    currentPwrdFactor,
    multiplier,
    defaultApy
) {
    if (cutoff.isBefore(launchDate)) {
        return defaultApy;
    }
    let blockAgo = await scanner.getDate(cutoff.toDate()).catch((error) => {
        logger.error(`Could not get block ${cutoff}`);
    });
    let gvtFactorInThatBlock = new BN(
        (
            await getGvt().factor({
                blockTag: blockAgo.block,
            })
        ).toString()
    );
    let gvtPriceInThatBlock = USD_DECIMAL.dividedBy(gvtFactorInThatBlock);
    let gvtApy = USD_DECIMAL.dividedBy(currentGvtFactor)
        .minus(gvtPriceInThatBlock)
        .multipliedBy(multiplier);

    let pwrdFactorInThatBlock = convertToBN(
        await getPwrd().factor({
            blockTag: blockAgo.block,
        })
    );

    let pwrdPriceInThatBlock = USD_DECIMAL.dividedBy(pwrdFactorInThatBlock);

    let pwrdApy = USD_DECIMAL.dividedBy(currentPwrdFactor)
        .minus(pwrdPriceInThatBlock)
        .multipliedBy(multiplier);

    logger.info(
        `block ${blockAgo.block} ${currentGvtFactor} ${currentPwrdFactor} factor gvt ${gvtFactorInThatBlock} ${gvtPriceInThatBlock} ${gvtApy} pwrd ${pwrdFactorInThatBlock} ${pwrdPriceInThatBlock} ${pwrdApy}`
    );
    return {
        pwrd: printPercentValue(pwrdApy),
        gvt: printPercentValue(gvtApy),
    };
};

const calcAlltimeApy = async function (
    startOfToday,
    gvtFactorNow,
    pwrdFactorNow
) {
    // utd today

    const allDuration = startOfToday.diff(launchDate);
    logger.info(`allDuration ${allDuration}`);
    const initFactor = new BN(1);
    const alltimeMultiplier = new BN(miniSecondsInYear).dividedBy(allDuration);
    const gvtApy = USD_DECIMAL.dividedBy(gvtFactorNow)
        .minus(initFactor)
        .multipliedBy(alltimeMultiplier);
    const pwrdApy = USD_DECIMAL.dividedBy(pwrdFactorNow)
        .minus(initFactor)
        .multipliedBy(alltimeMultiplier);
    return {
        pwrd: printPercentValue(pwrdApy),
        gvt: printPercentValue(gvtApy),
    };
};

const getGroStats = async function () {
    const gvt = getGvt();
    const pwrd = getPwrd();
    const lifeGuard = getLifeguard();
    const insurance = getInsurance();
    const exposure = getExposure();
    const vaults = getVaults();

    // capture the blocknumber
    const latestBlock = await provider.getBlock();
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };
    const nowTimestamp = latestBlock.timestamp;
    const now = dayjs.unix(nowTimestamp).utc();
    const startOfToday = now.startOf('day');

    let gvtFactorUtcToday = USD_DECIMAL;
    let pwrdFactorUtcToday = USD_DECIMAL;
    if (startOfToday.isAfter(launchDate)) {
        let blockUtcToday = await scanner
            .getDate(startOfToday)
            .catch((error) => {
                logger.error(`Could not get block ${cutoff}`);
            });
        const blockTagUtcToday = {
            blockTag: blockUtcToday.number,
        };

        gvtFactorUtcToday = convertToBN(await gvt.factor(blockTagUtcToday));
        pwrdFactorUtcToday = convertToBN(await pwrd.factor(blockTagUtcToday));
    }
    // now
    const apyAlltime = await calcAlltimeApy(
        startOfToday,
        gvtFactorUtcToday,
        pwrdFactorUtcToday
    );
    // last 24h ago
    const gvtFactorNow = convertToBN(await gvt.factor(latestBlockTag));
    const pwrdFactorNow = convertToBN(await pwrd.factor(latestBlockTag));
    let last24hAgo = now.subtract(1, 'day');
    if (last24hAgo.isBefore(launchDate)) {
        last24hAgo = launchDate;
    }
    const apyLast24h = await calcApyByPeriod(
        last24hAgo,
        gvtFactorNow,
        pwrdFactorNow,
        dailyApyMultiplier,
        apyAlltime
    );

    // one monthly
    const apyMonthly = await calcApyByPeriod(
        startOfToday.subtract(1, 'month'),
        gvtFactorUtcToday,
        pwrdFactorUtcToday,
        monthlyApyMultiplier,
        apyAlltime
    );

    // one week ago
    const apyWeekly = await calcApyByPeriod(
        startOfToday.subtract(1, 'week'),
        gvtFactorUtcToday,
        pwrdFactorUtcToday,
        weeklyApyMultiplier,
        apyAlltime
    );

    // one day ago
    const apyDaily = await calcApyByPeriod(
        startOfToday.subtract(1, 'day'),
        gvtFactorUtcToday,
        pwrdFactorUtcToday,
        dailyApyMultiplier,
        apyAlltime
    );

    // risk
    const preCal = await insurance.prepareCalculation(latestBlockTag);
    const riskResult = await exposure.calcRiskExposure(preCal, latestBlockTag);
    const exposureStableCoin = riskResult[0].map((percent, i) => {
        return {
            stablecoin: vaultNames[i],
            concentration: printPercentValue(
                convertToBN(percent).dividedBy(PERCENT_DECIMAL)
            ),
        };
    });

    const exposureProtocol = riskResult[1].map((percent, i) => {
        return {
            name: strategyNames[i],
            concentration: printPercentValue(
                convertToBN(percent).dividedBy(PERCENT_DECIMAL)
            ),
        };
    });
    // tvl
    const gvtAssets = convertToBN(await gvt.totalAssets(latestBlockTag));
    const prwdAssets = convertToBN(await pwrd.totalSupply(latestBlockTag));
    const totalAssetsUsd = gvtAssets.plus(prwdAssets);

    const utilRatioLimitPD = convertToBN(
        await getDepositHandler().utilizationRatioLimitPD(latestBlockTag)
    );
    const utilRatioLimitGW = convertToBN(
        await getWithdrawHandler().utilizationRatioLimitGW(latestBlockTag)
    );

    // lifeguard
    const lifeGuardAssets = convertToBN(
        await lifeGuard.totalAssetsUsd(latestBlockTag)
    );
    const lifeGuardShare = lifeGuardAssets.dividedBy(totalAssetsUsd);

    // vaults
    const promisesVaults = [];
    const vlength = getStrategyLength();
    vaults.forEach((vault, i) => {
        promisesVaults.push(
            getVaultAndStrategies(
                totalAssetsUsd,
                vault,
                i,
                vlength[i],
                latestBlockTag
            )
        );
    });
    const vaultAssets = await Promise.all(promisesVaults);

    let systemTotal = lifeGuardAssets;
    let systemShare = lifeGuardShare;
    vaultAssets.forEach((vault) => {
        systemTotal = systemTotal.plus(vault.amount);
        systemShare = systemShare.plus(vault.share);
    });

    const exposureStats = {
        stablecoins: exposureStableCoin,
        protocols: exposureProtocol,
    };

    const lifeGuardStats = {
        name: lifeguardNames,
        amount: printUsdValue(lifeGuardAssets),
        share: printPercentValue(lifeGuardShare),
    };

    const apy = {
        last24h: apyLast24h,
        daily: apyDaily,
        weekly: apyWeekly,
        monthly: apyMonthly,
        all_time: apyAlltime,
    };

    const tvl = {
        pwrd: printUsdValue(prwdAssets),
        gvt: printUsdValue(gvtAssets),
        total: printUsdValue(totalAssetsUsd),
        util_ratio: printPercentValue(prwdAssets.dividedBy(gvtAssets)),
        util_ratio_limit_PD: printPercentValue(
            utilRatioLimitPD.dividedBy(PERCENT_DECIMAL)
        ),
        util_ratio_limit_GW: printPercentValue(
            utilRatioLimitGW.dividedBy(PERCENT_DECIMAL)
        ),
    };

    const stats = {
        current_timestamp: nowTimestamp.toString(),
        launch_timestamp: launchTimestamp,
        network: process.env.NODE_ENV.toLowerCase(),
        apy: apy,
        tvl: tvl,
        system: {
            total_share: printPercentValue(systemShare),
            total_amount: printUsdValue(systemTotal),
            lifeguard: lifeGuardStats,
            vaults: vaultAssets,
        },
        exposure: exposureStats,
    };
    const statsFilename = `${statsDir}/gro-stats-${now.valueOf()}.json`;
    fs.writeFileSync(statsFilename, JSON.stringify(stats));
    const latestFilename = {
        filename: statsFilename,
    };
    fs.writeFileSync(statsLatest, JSON.stringify(latestFilename));
    // sendMessage(DISCORD_CHANNELS.protocolAssets, {
    //     type: MESSAGE_TYPES.stats,
    //     timestamp: new Date(),
    //     params: tvl,
    //     result: 'Generate stats file',
    // });
    return statsFilename;
};

module.exports = {
    getGroStats,
};
