const { BigNumber: BN } = require('bignumber.js');
const mapObject = require('map-obj');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { getConfig } = require('../../common/configUtil');

dayjs.extend(utc);

const {
    getAlchemyRpcProvider,
    getTimestampByBlockNumber,
} = require('../../common/chainUtil');
const { getSystemApy } = require('./apyHandler-new');
const { getGtokenApy, getHodlBonusApy } = require('./currentApyHandler-new');
const {
    getTvlStats,
    getSystemStats,
    getExposureStats,
} = require('./systemHandler-new');

const { apyStatsMessage } = require('../../discordMessage/statsMessage');
const logger = require('../statsLogger');

const provider = getAlchemyRpcProvider('stats_gro');

const FIXED_PERCENT = 6;
const FIXED_USD = 7;
const USD_DECIAML = BN(10).pow(BN(18));
const PERCENT_DECIAML = BN(10).pow(BN(6));

// config
const launchBlock = getConfig('blockchain.start_block');
const statsDir = getConfig('stats_folder');
const statsLatest = getConfig('stats_latest');

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

function formatArgentResponse(stats) {
    const argentStats = {};
    argentStats.current_timestamp = stats.current_timestamp;
    argentStats.launch_timestamp = stats.launch_timestamp;
    argentStats.network = stats.network;
    argentStats.apy = {};
    argentStats.apy.last7d = stats.apy.last7d;
    argentStats.apy.current = stats.apy.current;
    argentStats.tvl = {};
    argentStats.tvl.pwrd = stats.tvl.pwrd;
    argentStats.tvl.gvt = stats.tvl.gvt;
    argentStats.tvl.total = stats.tvl.total;
    return argentStats;
}

async function generateGroStatsFile() {
    const latestBlock = await provider.getBlock();
    const latestBlockTag = {
        blockTag: latestBlock.number,
    };

    const launchTimestamp = await getTimestampByBlockNumber(
        launchBlock,
        provider
    );

    const stats = {
        current_timestamp: latestBlock.timestamp.toString(),
        launch_timestamp: launchTimestamp,
        network: process.env.NODE_ENV.toLowerCase(),
    };
    const apy = await getSystemApy(latestBlock, provider);
    stats.apy = mapper(apy, ['pwrd', 'gvt'], []);

    const tvl = await getTvlStats(latestBlockTag);

    const system = await getSystemStats(tvl.total, latestBlockTag);

    const exposure = await getExposureStats(latestBlockTag, system);

    apy.hodl_bonus = await getHodlBonusApy();

    apy.current = await getGtokenApy(
        system.last3d_apy,
        tvl.util_ratio,
        apy.hodl_bonus
    );

    stats.apy = mapper(apy, ['pwrd', 'gvt', 'hodl_bonus'], []);
    stats.tvl = mapper(
        tvl,
        ['util_ratio', 'util_ratio_limit_PD', 'util_ratio_limit_GW'],
        ['pwrd', 'gvt', 'total']
    );
    stats.system = mapper(
        system,
        ['total_share', 'share', 'last3d_apy'],
        ['total_amount', 'amount']
    );
    stats.exposure = mapper(exposure, ['concentration'], []);

    const statsFilename = `${statsDir}/gro-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(statsFilename, JSON.stringify(stats));
    const argentStatsFilename = `${statsDir}/argent-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(
        argentStatsFilename,
        JSON.stringify(formatArgentResponse(stats))
    );
    const latestFilename = {
        filename: statsFilename,
        argentFilename: argentStatsFilename,
    };
    fs.writeFileSync(statsLatest, JSON.stringify(latestFilename));
    logger.info(
        `Power Dollar:${stats.tvl.pwrd} Gro Vault:${stats.tvl.gvt} TotalAssets:${stats.tvl.total} Utilization Ratio:${stats.tvl.util_ratio}`
    );
    apyStatsMessage({
        vaultTVL: tvl.gvt,
        vaultApy: apy.last7d.gvt,
        pwrdTVL: tvl.pwrd,
        pwrdApy: apy.last7d.pwrd,
        total: tvl.total,
        utilRatio: tvl.util_ratio,
    });
    return statsFilename;
}

module.exports = {
    generateGroStatsFile,
};
