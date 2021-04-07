'use strict';

const { BigNumber: BN } = require('bignumber.js');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const logger = require('../statsLogger');
const { getDefaultProvider } = require('../../common/chainUtil');
const { getSystemApy } = require('./apyHandler');
const {
    getTvlStats,
    getSystemStats,
    getExposureStats,
} = require('./systemHandler');

const config = require('config');
const provider = getDefaultProvider();

const FIXED_PERCENT = 4;
const FIXED_USD = 7;
const USD_DECIAML = BN(10).pow(BN(18));
const PERCENT_DECIAML = BN(10).pow(BN(4));

// config
const launchTimestamp = config.get('blockchain.launch_timestamp');
const statsDir = config.get('stats_folder');
const statsLatest = config.get('stats_latest');

const printPercent = function (value) {
    return BN(value.toString())
        .div(PERCENT_DECIAML)
        .toFixed(FIXED_PERCENT)
        .toString();
};

const printUsd = function (value) {
    return BN(value.toString()).div(USD_DECIAML).toFixed(FIXED_USD).toString();
};

const formatOneAPY = function (originalAPY) {
    return {
        pwrd: printPercent(originalAPY.pwrd),
        gvt: printPercent(originalAPY.gvt),
    };
};

const formatStats = function (stats) {
    const formatted = {
        current_timestamp: stats.current_timestamp,
        launch_timestamp: stats.launch_timestamp,
        network: stats.network,
    };
    const originalApy = stats.apy;
    formatted.apy = {
        last24h: formatOneAPY(originalApy.last24h),
        daily: formatOneAPY(originalApy.daily),
        weekly: formatOneAPY(originalApy.weekly),
        monthly: formatOneAPY(originalApy.monthly),
        all_time: formatOneAPY(originalApy.all_time),
    };
    formatted.tvl = formatTvl(stats);
    formatted.system = formatSystem(stats);
    formatted.exposure = formatExposure(stats);
    return formatted;
};

const formatTvl = function (stats) {
    const originalTvl = stats.tvl;
    const tvl = {
        pwrd: printUsd(originalTvl.pwrd),
        gvt: printUsd(originalTvl.gvt),
        total: printUsd(originalTvl.total),
        util_ratio: printPercent(originalTvl.util_ratio),
        util_ratio_limit_PD: printPercent(originalTvl.util_ratio_limit_PD),
        util_ratio_limit_GW: printPercent(originalTvl.util_ratio_limit_GW),
    };
    return tvl;
};

const formatVaults = function (vaults) {
    return vaults.map((vault) => {
        const strategies = vault.strategies.map((strategy) => {
            return {
                name: strategy.name,
                amount: printUsd(strategy.amount),
                share: printPercent(strategy.share),
            };
        });
        return {
            stablecoin: vault.stablecoin,
            amount: printUsd(vault.amount),
            share: printPercent(vault.share),
            strategies,
        };
    });
};

const formatExposure = function (stats) {
    const originalStablecoins = stats.exposure.stablecoins;
    const originalProtocols = stats.exposure.protocols;
    const stablecoins = originalStablecoins.map((item) => {
        return {
            stablecoin: item.stablecoin,
            concentration: printPercent(item.concentration),
        };
    });
    const protocols = originalProtocols.map((item) => {
        return {
            name: item.name,
            concentration: printPercent(item.concentration),
        };
    });
    return {
        stablecoins,
        protocols,
    };
};

const formatSystem = function (stats) {
    const originalSystem = stats.system;
    const system = {
        total_share: printPercent(originalSystem.total_share),
        total_amount: printUsd(originalSystem.total_amount),
        lifeguard: {
            name: originalSystem.lifeguard.name,
            amount: printUsd(originalSystem.lifeguard.amount),
            share: printPercent(originalSystem.lifeguard.share),
        },
        vaults: formatVaults(originalSystem.vaults),
    };

    return system;
};

const generateGroStatsFile = async function () {
    const latestBlock = await provider.getBlock();
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };

    const stats = {
        current_timestamp: latestBlock.timestamp.toString(),
        launch_timestamp: launchTimestamp,
        network: process.env.NODE_ENV.toLowerCase(),
    };
    stats.apy = await getSystemApy(latestBlock);
    stats.tvl = await getTvlStats(latestBlockTag);
    stats.system = await getSystemStats(stats.tvl.total, latestBlockTag);
    stats.exposure = await getExposureStats(latestBlockTag);
    const formattedStats = formatStats(stats);
    const statsFilename = `${statsDir}/gro-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(statsFilename, JSON.stringify(formattedStats));
    const latestFilename = {
        filename: statsFilename,
    };
    fs.writeFileSync(statsLatest, JSON.stringify(latestFilename));
    return statsFilename;
};

module.exports = {
    generateGroStatsFile,
};
