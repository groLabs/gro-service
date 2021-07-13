const { query } = require('./queryHandler');
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const {
    QUERY_ERROR,
} = require('../common/personalUtil');

const DIFF_5m = 300;
const DIFF_1h = 3600;
const DIFF_1d = 86400;
const DIFF_1w = 604800;
const MARGIN = 200;
const NA = 'NA';

const getTimeTransformations = (target) => {
    return {
        "MIN_5m": target - (DIFF_5m - MARGIN),
        "MAX_5m": target - (DIFF_5m + MARGIN),
        "MIN_1h": target - (DIFF_1h - MARGIN),
        "MAX_1h": target - (DIFF_1h + MARGIN),
        "MIN_1d": target - (DIFF_1d - MARGIN),
        "MAX_1d": target - (DIFF_1d + MARGIN),
        "MIN_1w": target - (DIFF_1w - MARGIN),
        "MAX_1w": target - (DIFF_1w + MARGIN),
    }
}

const getTimestamps = async (targetTimestamp, table, filter) => {
    try {
        const delta = getTimeTransformations(targetTimestamp);
        const [
            current,
            diff_5m,
            diff_1h,
            diff_1d,
            diff_1w,
        ] = await Promise.all([
            query(`select_all_${table}.sql`, [targetTimestamp, targetTimestamp, ...filter]),
            query(`select_all_${table}.sql`, [delta.MAX_5m, delta.MIN_5m, ...filter]),
            query(`select_all_${table}.sql`, [delta.MAX_1h, delta.MIN_1h, ...filter]),
            query(`select_all_${table}.sql`, [delta.MAX_1d, delta.MIN_1d, ...filter]),
            query(`select_all_${table}.sql`, [delta.MAX_1w, delta.MIN_1w, ...filter]),
        ]);

        if (current === QUERY_ERROR || diff_5m === QUERY_ERROR || diff_1h === QUERY_ERROR
            || diff_1d === QUERY_ERROR || diff_1w === QUERY_ERROR)
            throw `Query error in getTimestamps [targetTimestamp: ${targetTimestamp}]`;

        return {
            "current": current.rows[0],
            "diff_5m": diff_5m.rows[0],
            "diff_1h": diff_1h.rows[0],
            "diff_1d": diff_1d.rows[0],
            "diff_1w": diff_1w.rows[0],
        }
    } catch (err) {
        console.log(err);
    }
}

const getDistincts = async (targetTimestamp, table) => {
    try {
        const res = await query(`select_distinct_${table}.sql`, [targetTimestamp, targetTimestamp]);
        if (res === QUERY_ERROR)
            throw `Query error in getTimestamps [targetTimestamp: ${targetTimestamp}]`;
        return res.rows;
    } catch (err) {
        console.log(err);
    }
}

const calcKPI = (root, kpi) => {
    return {
        [kpi]: root.current[kpi],
        [kpi + '_5m']: (root.diff_5m) ? root.diff_5m[kpi] : NA,
        [kpi + '_5m_dif']: (root.diff_5m) ? root.current[kpi] - root.diff_5m[kpi] : NA,
        [kpi + '_1h']: (root.diff_1h) ? root.diff_1h[kpi] : NA,
        [kpi + '_1h_dif']: (root.diff_1h) ? root.current[kpi] - root.diff_1h[kpi] : NA,
        [kpi + '_1d']: (root.diff_1d) ? root.diff_1d[kpi] : NA,
        [kpi + '_1d_dif']: (root.diff_1d) ? root.current[kpi] - root.diff_1d[kpi] : NA,
        [kpi + '_1w']: (root.diff_1w) ? root.diff_1w[kpi] : NA,
        [kpi + '_1w_dif']: (root.diff_1w) ? root.current[kpi] - root.diff_1w[kpi] : NA,
    }
}

const getTVL = async (targetTimestamp) => {
    const tvl = await getTimestamps(targetTimestamp, 'protocol_tvl', []);
    if (tvl.current) {
        return {
            "launch_timestamp": tvl.current.launch_timestamp,
            "launch_date": tvl.current.launch_date,
            ...calcKPI(tvl, 'tvl_total'),
            ...calcKPI(tvl, 'tvl_pwrd'),
            ...calcKPI(tvl, 'tvl_gvt'),
            ...calcKPI(tvl, 'util_ratio'),
            ...calcKPI(tvl, 'tvl_total'),
            ...calcKPI(tvl, 'util_ratio_limit_pwrd'),
            ...calcKPI(tvl, 'util_ratio_limit_gvt'),
        };
    } else {
        return {};
    }
}

const getAPY = async (targetTimestamp, productId) => {
    const apy = await getTimestamps(targetTimestamp, 'protocol_apy', [productId]);
    if (apy.current) {
        return {
            "launch_timestamp": apy.current.launch_timestamp,
            "launch_date": apy.current.launch_date,
            ...calcKPI(apy, 'apy_last24h'),
            ...calcKPI(apy, 'apy_last7d'),
            ...calcKPI(apy, 'apy_daily'),
            ...calcKPI(apy, 'apy_weekly'),
            ...calcKPI(apy, 'apy_monthly'),
            ...calcKPI(apy, 'apy_all_time'),
        };
    } else {
        return {};
    }
}

const getLifeguard = async (targetTimestamp) => {
    const lifeguard = await getTimestamps(targetTimestamp, 'protocol_lifeguard', []);
    if (lifeguard.current) {
        return {
            "launch_timestamp": lifeguard.current.launch_timestamp,
            "launch_date": lifeguard.current.launch_date,
            "name": lifeguard.current.name,
            "display_name": lifeguard.current.display_name,
            ...calcKPI(lifeguard, 'amount'),
            ...calcKPI(lifeguard, 'share'),
            ...calcKPI(lifeguard, 'last3d_apy'),
        };
    } else {
        return {};
    }
}

const getSystem = async (targetTimestamp) => {
    const system = await getTimestamps(targetTimestamp, 'protocol_system', []);
    if (system.current) {
        return {
            "launch_timestamp": system.current.launch_timestamp,
            "launch_date": system.current.launch_date,
            ...calcKPI(system, 'total_share'),
            ...calcKPI(system, 'total_amount'),
            ...calcKPI(system, 'last3d_apy'),
            ...calcKPI(system, 'hodl_bonus'),
        };
    } else {
        return {};
    }
}

const getVaults = async (targetTimestamp) => {
    let result = [];
    const vaults = await getDistincts(targetTimestamp, 'protocol_vaults');
    if (vaults.length > 0) {
        for (const item of vaults) {
            const vault = await getTimestamps(targetTimestamp, 'protocol_vaults', [item.name]);
            if (vault.current) {
                result.push({
                    "launch_timestamp": vault.current.launch_timestamp,
                    "launch_date": vault.current.launch_date,
                    "name": vault.current.name,
                    "display_name": vault.current.display_name,
                    ...calcKPI(vault, 'amount'),
                    ...calcKPI(vault, 'share'),
                    ...calcKPI(vault, 'last3d_apy'),
                });
            } else {
                return {};
            }
        }
    } else {
        return {};
    }
    return result;
}

const getReserves = async (targetTimestamp) => {
    let result = [];
    const reserves = await getDistincts(targetTimestamp, 'protocol_reserves');
    if (reserves.length > 0) {
        for (const item of reserves) {
            const reserve = await getTimestamps(
                targetTimestamp,
                'protocol_reserves',
                [item.vault_name, item.reserve_name]
            );
            if (reserve.current) {
                result.push({
                    "launch_timestamp": reserve.current.launch_timestamp,
                    "launch_date": reserve.current.launch_date,
                    "vault_name": reserve.current.vault_name,
                    "reserve_name": reserve.current.reserve_name,
                    "display_name": reserve.current.display_name,
                    ...calcKPI(reserve, 'amount'),
                    ...calcKPI(reserve, 'share'),
                    ...calcKPI(reserve, 'last3d_apy'),
                });
            } else {
                return {};
            }
        }
    } else {
        return {};
    }
    return result;
}

const getStrategies = async (targetTimestamp) => {
    let result = [];
    const strategies = await getDistincts(targetTimestamp, 'protocol_strategies');
    if (strategies.length > 0) {
        for (const item of strategies) {
            const strategy = await getTimestamps(
                targetTimestamp,
                'protocol_strategies',
                [item.vault_name, item.strategy_name]
            );
            if (strategy.current) {
                result.push({
                    "launch_timestamp": strategy.current.launch_timestamp,
                    "launch_date": strategy.current.launch_date,
                    "vault_name": strategy.current.vault_name,
                    "strategy_name": strategy.current.strategy_name,
                    "display_name": strategy.current.display_name,
                    ...calcKPI(strategy, 'amount'),
                    ...calcKPI(strategy, 'share'),
                    ...calcKPI(strategy, 'last3d_apy'),
                });
            } else {
                return {};
            }
        }
    } else {
        return {};
    }
    return result;
}

const getExposureStables = async (targetTimestamp) => {
    let result = [];
    const stables = await getDistincts(targetTimestamp, 'protocol_exposure_stables');
    if (stables.length > 0) {
        for (const item of stables) {
            const stable = await getTimestamps(
                targetTimestamp,
                'protocol_exposure_stables',
                [item.name]
            );
            if (stable.current) {
                result.push({
                    "launch_timestamp": stable.current.launch_timestamp,
                    "launch_date": stable.current.launch_date,
                    "name": stable.current.name,
                    "display_name": stable.current.display_name,
                    ...calcKPI(stable, 'concentration'),
                });
            } else {
                return {};
            }
        }
    } else {
        return {};
    }
    return result;
}

const getExposureProtocols = async (targetTimestamp) => {
    let result = [];
    const protocols = await getDistincts(targetTimestamp, 'protocol_exposure_protocols');
    if (protocols.length > 0) {
        for (const item of protocols) {
            const protocol = await getTimestamps(
                targetTimestamp,
                'protocol_exposure_protocols',
                [item.name]
            );
            if (protocol.current) {
                result.push({
                    "launch_timestamp": protocol.current.launch_timestamp,
                    "launch_date": protocol.current.launch_date,
                    "name": protocol.current.name,
                    "display_name": protocol.current.display_name,
                    ...calcKPI(protocol, 'concentration'),
                });
            } else {
                return {};
            }
        }
    } else {
        return {};
    }
    return result;
}

const groStatsHandler = async (targetTimestamp, productId) => {
    // const res = await getTVL(1624826772);
    // const res = await getAPY(1624827717, 1);
    // const res = await getAPY(1624827717, 2);
    // const res = await getLifeguard(1624827717);
    // const res = await getSystem(1624827717);
    // const res = await getVaults(1624827717);
    // const res = await getStrategies(1624827717);
    // const res = await getExposureStables(1624827717);
    // const res = await getExposureProtocols(1624827717);
    const res = await getReserves(1624827717);
    console.log(res);
    process.exit();
}

module.exports = {
    groStatsHandler,
}