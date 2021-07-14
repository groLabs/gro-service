// const botEnv = process.env.BOT_ENV.toLowerCase();
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const {
    getNetworkId
} = require('../common/personalUtil');

// TODO: from DB?
const getProductId = (product) => {
    return (product === 'pwrd' ? 1 : 2);
}

const defaultData = (stats) => {
    return [
        stats.launch_timestamp,
        moment.unix(stats.launch_timestamp).utc(),
        getNetworkId(),
    ];
};

const getAPY = (stats, product) => {
    const result = [
        ...defaultData(stats),
        getProductId(product),
        stats.apy.last24h[product],
        stats.apy.last7d[product],
        stats.apy.daily[product],
        stats.apy.weekly[product],
        stats.apy.monthly[product],
        stats.apy.all_time[product],
        stats.apy.current[product],
        moment().utc(),
    ];
    return result;
}

const getTVL = (stats) => {
    const result = [
        ...defaultData(stats),
        stats.tvl.pwrd,
        stats.tvl.gvt,
        stats.tvl.total,
        stats.tvl.util_ratio,
        stats.tvl.util_ratio_limit_PD,
        stats.tvl.util_ratio_limit_GW,
        moment().utc(),
    ];
    return result;
}

const getSystem = (stats) => {
    const result = [
        ...defaultData(stats),
        stats.system.total_share,
        stats.system.total_amount,
        stats.system.last3d_apy,
        stats.apy.hodl_bonus,
        moment().utc(),
    ];
    return result;
}

const getLifeguard = (stats) => {
    const result = [
        ...defaultData(stats),
        stats.system.lifeguard.name,
        stats.system.lifeguard.display_name,
        stats.system.lifeguard.amount,
        stats.system.lifeguard.share,
        stats.system.lifeguard.last3d_apy,
        moment().utc(),
    ];
    return result;
}

const getVaults = (stats) => {
    let result = [];
    for (const vault of stats.system.vault) {
        result.push([
            ...defaultData(stats),
            vault.name,
            vault.display_name,
            vault.amount,
            vault.share,
            vault.last3d_apy,
            moment().utc(),
        ]);
    }
    return result;
}

const getReserves = (stats) => {
    let result = [];
    for (const reserve of stats.system.vault) {
        result.push([
            ...defaultData(stats),
            reserve.name,
            reserve.reserves.name,
            reserve.reserves.display_name,
            reserve.reserves.amount,
            reserve.reserves.share,
            reserve.reserves.last3d_apy,
            moment().utc(),
        ]);
    }
    return result;
}

const getStrategies = (stats) => {
    let result = [];
    for (const vault of stats.system.vault) {
        for (const strategy of vault.strategies) {
            result.push([
                ...defaultData(stats),
                vault.name,
                strategy.name,
                strategy.display_name,
                strategy.address,
                strategy.amount,
                strategy.share,
                strategy.last3d_apy,
                moment().utc(),
            ]);
        }
    }
    return result;
}

const getExposureStables = (stats) => {
    let result = [];
    for (const stablecoin of stats.exposure.stablecoins) {
        result.push([
            ...defaultData(stats),
            stablecoin.name,
            stablecoin.display_name,
            stablecoin.concentration,
            moment().utc(),
        ]);
    }
    return result;
}

const getExposureProtocols = (stats) => {
    let result = [];
    for (const protocol of stats.exposure.protocols) {
        result.push([
            ...defaultData(stats),
            protocol.name,
            protocol.display_name,
            protocol.concentration,
            moment().utc(),
        ]);
    }
    return result;
}

module.exports = {
    getAPY,
    getTVL,
    getSystem,
    getLifeguard,
    getVaults,
    getReserves,
    getStrategies,
    getExposureStables,
    getExposureProtocols,
}
