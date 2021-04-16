'use strict';

const { BigNumber: BN } = require('bignumber.js');
const mapObject = require('map-obj');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const logger = require('../statsLogger');
const { getDefaultProvider } = require('../../common/chainUtil');
const { getSystemApy } = require('./apyHandler');
const {
    sendMessageToProtocolAssetChannel,
    MESSAGE_TYPES,
} = require('../../common/discord/discordService');
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

const mapper = function (original, percentKeys, amountKeys) {
    return mapObject(
        original,
        (key, value) => {
            if (percentKeys.length > 0 && percentKeys.includes(key)) {
                return [key, printPercent(value)];
            } else if (amountKeys.length > 0 && amountKeys.includes(key)) {
                return [key, printUsd(value)];
            }
            return [key, value];
        },
        { deep: true }
    );
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
    const apy = await getSystemApy(latestBlock);
    stats.apy = mapper(apy, ['pwrd', 'gvt'], []);

    const tvl = await getTvlStats(latestBlockTag);
    stats.tvl = mapper(
        tvl,
        ['util_ratio', 'util_ratio_limit_PD', 'util_ratio_limit_GW'],
        ['pwrd', 'gvt', 'total']
    );

    const system = await getSystemStats(tvl.total, latestBlockTag);
    stats.system = mapper(
        system,
        ['total_share', 'share'],
        ['total_amount', 'amount']
    );
    const exposure = await getExposureStats(latestBlockTag);
    stats.exposure = mapper(exposure, ['concentration'], []);

    const statsFilename = `${statsDir}/gro-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(statsFilename, JSON.stringify(stats));
    const latestFilename = {
        filename: statsFilename,
    };
    fs.writeFileSync(statsLatest, JSON.stringify(latestFilename));
    sendMessageToProtocolAssetChannel({
        message: `\nPower Dollar:${stats.tvl.pwrd}\nGro Vault:${stats.tvl.gvt}\nTotalAssets:${stats.tvl.total}\nUtilization Ratio:${stats.tvl.util_ratio}`,
        type: MESSAGE_TYPES.stats,
    });
    return statsFilename;
};

module.exports = {
    generateGroStatsFile,
};
