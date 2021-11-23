"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExposureProtocols = exports.getExposureStables = exports.getStrategies = exports.getReserves = exports.getVaults = exports.getLifeguardStables = exports.getLifeguard = exports.getSystem = exports.getTVL = exports.getAPY = void 0;
const moment_1 = __importDefault(require("moment"));
const personalUtil_1 = require("../common/personalUtil");
// TODO: from DB?
const getProductId = (product) => {
    return (product === 'pwrd' ? 1 : 2);
};
const defaultData = (stats) => {
    return [
        stats.current_timestamp,
        moment_1.default.unix(stats.current_timestamp).utc(),
        (0, personalUtil_1.getNetworkId)(),
    ];
};
// const getAPY = (stats, product) => {
//     const result = [
//         ...defaultData(stats),
//         getProductId(product),
//         stats.apy.last24h[product],
//         stats.apy.last7d[product],
//         stats.apy.daily[product],
//         stats.apy.weekly[product],
//         stats.apy.monthly[product],
//         stats.apy.all_time[product],
//         stats.apy.current[product],
//         moment().utc(),
//     ];
//     return result;
// }
const getAPY = (stats, product) => {
    const result = [
        ...defaultData(stats),
        getProductId(product),
        (stats.apy.last24h) ? stats.apy.last24h[product] : null,
        (stats.apy.last7d) ? stats.apy.last7d[product] : null,
        (stats.apy.daily) ? stats.apy.daily[product] : null,
        (stats.apy.weekly) ? stats.apy.weekly[product] : null,
        (stats.apy.monthly) ? stats.apy.monthly[product] : null,
        (stats.apy.all_time) ? stats.apy.all_time[product] : null,
        (stats.apy.current) ? stats.apy.current[product] : null,
        (0, moment_1.default)().utc(),
    ];
    return result;
};
exports.getAPY = getAPY;
const getTVL = (stats) => {
    const result = [
        ...defaultData(stats),
        stats.tvl.pwrd,
        stats.tvl.gvt,
        stats.tvl.total,
        stats.tvl.util_ratio,
        stats.tvl.util_ratio_limit_PD,
        stats.tvl.util_ratio_limit_GW,
        (0, moment_1.default)().utc(),
    ];
    return result;
};
exports.getTVL = getTVL;
const getSystem = (stats) => {
    const result = [
        ...defaultData(stats),
        stats.system.total_share,
        stats.system.total_amount,
        stats.system.last3d_apy,
        stats.apy.hodl_bonus,
        (0, moment_1.default)().utc(),
    ];
    return result;
};
exports.getSystem = getSystem;
const getLifeguard = (stats) => {
    const result = [
        ...defaultData(stats),
        stats.system.lifeguard.name,
        stats.system.lifeguard.display_name,
        stats.system.lifeguard.amount,
        stats.system.lifeguard.share,
        stats.system.lifeguard.last3d_apy,
        (0, moment_1.default)().utc(),
    ];
    return result;
};
exports.getLifeguard = getLifeguard;
const getLifeguardStables = (stats) => {
    let result = [];
    for (const protocol of stats.system.lifeguard.stablecoins) {
        result.push([
            ...defaultData(stats),
            protocol.name,
            protocol.display_name,
            protocol.amount,
            (0, moment_1.default)().utc(),
        ]);
    }
    return result;
};
exports.getLifeguardStables = getLifeguardStables;
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
            (0, moment_1.default)().utc(),
        ]);
    }
    return result;
};
exports.getVaults = getVaults;
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
            (0, moment_1.default)().utc(),
        ]);
    }
    return result;
};
exports.getReserves = getReserves;
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
                (0, moment_1.default)().utc(),
            ]);
        }
    }
    return result;
};
exports.getStrategies = getStrategies;
const getExposureStables = (stats) => {
    let result = [];
    for (const stablecoin of stats.exposure.stablecoins) {
        result.push([
            ...defaultData(stats),
            stablecoin.name,
            stablecoin.display_name,
            stablecoin.concentration,
            (0, moment_1.default)().utc(),
        ]);
    }
    return result;
};
exports.getExposureStables = getExposureStables;
const getExposureProtocols = (stats) => {
    let result = [];
    for (const protocol of stats.exposure.protocols) {
        result.push([
            ...defaultData(stats),
            protocol.name,
            protocol.display_name,
            protocol.concentration,
            (0, moment_1.default)().utc(),
        ]);
    }
    return result;
};
exports.getExposureProtocols = getExposureProtocols;
