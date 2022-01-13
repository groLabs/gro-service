import { BigNumber as BN } from 'bignumber.js';
import mapObject from 'map-obj';
import fs from 'fs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getConfig } from '../../common/configUtil';

dayjs.extend(utc);

import { getAlchemyRpcProvider, getTimestampByBlockNumber } from '../../common/chainUtil';
import { getSystemApy } from './apyHandler';
import { getGtokenApy, getHodlBonusApy } from './currentApyHandler';
import { getAvaxSystemStats } from './avaxSystemHandler';
import { getTvlStats, getSystemStats, getExposureStats } from './systemHandler';
import { getPools } from './groTokenHandler';
import { ParameterError } from '../../common/error';
import { apyStatsMessage } from '../../discordMessage/statsMessage';

const logger = require('../statsLogger');


const provider = getAlchemyRpcProvider('stats_gro');

const FIXED_PERCENT = 6;
const FIXED_USD = 7;
const USD_DECIAML = new BN(10).pow(new BN(18));
const PERCENT_DECIAML = new BN(10).pow(new BN(6));

// config
const launchBlock = getConfig('blockchain.start_block');
const statsDir = getConfig('stats_folder');
const statsLatest = getConfig('stats_latest');

function printPercent(value) {
    return new BN(value.toString())
        .div(PERCENT_DECIAML)
        .toFixed(FIXED_PERCENT)
        .toString();
}

function printUsd(value) {
    return new BN(value.toString()).div(USD_DECIAML).toFixed(FIXED_USD).toString();
}

function mapper(original, percentKeys, amountKeys) {
    return mapObject(
        original,
        //@ts-ignore
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
    const argentStats = {} as any;
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

function formatExternalResponse(stats) {
    const externalStats = {} as any;
    externalStats.current_timestamp = stats.current_timestamp;
    externalStats.launch_timestamp = stats.launch_timestamp;
    externalStats.network = stats.network;
    externalStats.apy = {};
    externalStats.apy.last7d = stats.apy.last7d;
    externalStats.apy.current = stats.apy.current;
    externalStats.tvl = {};
    externalStats.tvl.pwrd = stats.tvl.pwrd;
    externalStats.tvl.gvt = stats.tvl.gvt;
    externalStats.tvl.total = stats.tvl.total;
    return externalStats;
}

async function generateGroStatsMcFile() {
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
    } as any;
    const apy = await getSystemApy(latestBlock, provider);
    stats.apy = mapper(apy, ['pwrd', 'gvt'], []);

    const tvl = await getTvlStats(latestBlockTag);

    const system = await getSystemStats(tvl.total, latestBlockTag);

    const exposure = await getExposureStats(latestBlockTag, system);

    (apy as any).hodl_bonus = await getHodlBonusApy();

    (apy as any).current = await getGtokenApy(
        system.last3d_apy,
        tvl.util_ratio,
        (apy as any).hodl_bonus
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
    const poolsInfo = await getPools((apy as any).current, latestBlockTag);
    stats.token_price_usd = poolsInfo.tokenPriceUsd;
    stats.pools = poolsInfo.pools;
    const statsFilename = `${statsDir}/gro-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(statsFilename, JSON.stringify(stats));
    const argentStatsFilename = `${statsDir}/argent-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(
        argentStatsFilename,
        JSON.stringify(formatArgentResponse(stats))
    );
    const externalStatsFilename = `${statsDir}/external-stats-${latestBlock.timestamp}.json`;
    fs.writeFileSync(
        externalStatsFilename,
        JSON.stringify(formatExternalResponse(stats))
    );
    // const latestFilename = {
    //     filename: statsFilename,
    //     argentFilename: argentStatsFilename,
    //     externalFilename: externalStatsFilename,
    // };
    // fs.writeFileSync(statsLatest, JSON.stringify(latestFilename));
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

    const avaxSystem = await getAvaxSystemStats();
    const mcTotals = {
        tvl: {
            mainnet: tvl.total,
            avalanche: avaxSystem.tvl.total,
            total: tvl.total.add(avaxSystem.tvl.total),
        },
    };
    const formattedTvl = mapper(
        mcTotals,
        ['total_share', 'share', 'last3d_apy'],
        ['avalanche', 'total', 'mainnet']
    );
    const formattedAvaxSystem = mapper(
        avaxSystem,
        [
            'total_share',
            'share',
            'last3d_apy',
            'all_time_apy',
            'sharpe_ratio',
            'sortino_ratio',
            'romad_ratio',
            'apy',
            'last3d_apy',
            'all_time_apy',
            'avax_exposure',
        ],
        [
            'total_amount',
            'total',
            'avax',
            'amount',
            'groDAI.e_vault',
            'groUSDC.e_vault',
            'groUSDT.e_vault',
            'groDAI.e_vault_v1_5',
            'groUSDC.e_vault_v1_5',
            'groUSDT.e_vault_v1_5',
	    'groDAI.e_vault_v1_6',
            'groUSDC.e_vault_v1_6',
            'groUSDT.e_vault_v1_6',
            'open_amount',
            'close_amount',
            'current_amount',
            'tvl_cap',
        ]
    );
    const groStatsMultiChain = {
        current_timestamp: latestBlock.timestamp.toString(),
        network: process.env.NODE_ENV.toLowerCase(),
        mc_totals: formattedTvl,
        mainnet: stats,
        avalanche: formattedAvaxSystem,
    };
    const statsMcFilename = `${statsDir}/gro-stats-mc-${latestBlock.timestamp}.json`;
    fs.writeFileSync(statsMcFilename, JSON.stringify(groStatsMultiChain));

    const latestFilenames = {
        filename: statsFilename,
        mcFilename: statsMcFilename,
        argentFilename: argentStatsFilename,
        externalFilename: externalStatsFilename,
    };
    fs.writeFileSync(statsLatest, JSON.stringify(latestFilenames));
    return statsFilename;
}

export {
    generateGroStatsMcFile,
};
