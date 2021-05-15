const { BigNumber: BN } = require('bignumber.js');
const config = require('config');
const mapObject = require('map-obj');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const { getDefaultProvider } = require('../../common/chainUtil');
const { getSystemApy } = require('./apyHandler');
const {
    getTvlStats,
    getSystemStats,
    getExposureStats,
} = require('./systemHandler');

const { apyStatsMessage } = require('../../discordMessage/statsMessage');
const logger = require('../statsLogger');

const provider = getDefaultProvider();

const FIXED_PERCENT = 6;
const FIXED_USD = 7;
const USD_DECIAML = BN(10).pow(BN(18));
const PERCENT_DECIAML = BN(10).pow(BN(6));

// config
const launchTimestamp = config.get('blockchain.launch_timestamp');
const statsDir = config.get('stats_folder');
const statsLatest = config.get('stats_latest');

function printPercent(value) {
    return BN(value.toString())
        .div(PERCENT_DECIAML)
        .toFixed(FIXED_PERCENT)
        .toString();
}

function printUsd(value) {
    return BN(value.toString()).div(USD_DECIAML).toFixed(FIXED_USD).toString();
}

function mapper(original, percentKeys, amountKeys) {
    return mapObject(
        original,
        (key, value) => {
            let result = [key, value];
            if (percentKeys.length > 0 && percentKeys.includes(key)) {
                result = [key, printPercent(value)];
            } else if (amountKeys.length > 0 && amountKeys.includes(key)) {
                result = [key, printUsd(value)];
            }
            return result;
        },
        { deep: true }
    );
}

async function generateGroStatsFile() {
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
    logger.info(
        `Power Dollar:${stats.tvl.pwrd} Gro Vault:${stats.tvl.gvt} TotalAssets:${stats.tvl.total} Utilization Ratio:${stats.tvl.util_ratio}`
    );
    apyStatsMessage({
        vaultTVL: stats.tvl.gvt,
        pwrdTVL: stats.tvl.pwrd,
        total: stats.tvl.total,
    });
    return statsFilename;
}

module.exports = {
    generateGroStatsFile,
};
