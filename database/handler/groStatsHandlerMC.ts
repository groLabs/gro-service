import { query } from './queryHandler';
import { QUERY_ERROR } from '../constants';
import { showError } from '../handler/logHandler';

const DIFF_5m = 300;
const DIFF_1h = 3600;
const DIFF_1d = 86400;
const DIFF_1w = 604800;
const MARGIN_5m = 180;      // 3m
const MARGIN_1h = 900;      // 15m
const MARGIN_1d = 3600;     // 1h
const MARGIN_1w = 43200;    // 12h;
const NA = 'NA';

/// @notice Returns an object with all time transformations (-5m, -1h, -1d, -1w)
///         with a margin up/down from a given target date
/// @dev:   5m: range between 2m & 8m ago
///         1h: range between 45m & 75m ago
///         1d: range between 
const getTimeTransformations = (target: number) => {
    return {
        "MIN_5m": target - (DIFF_5m - MARGIN_5m),
        "MAX_5m": target - (DIFF_5m + MARGIN_5m),
        "MIN_1h": target - (DIFF_1h - MARGIN_1h),
        "MAX_1h": target - (DIFF_1h + MARGIN_1h),
        "MIN_1d": target - (DIFF_1d - MARGIN_1d),
        "MAX_1d": target - (DIFF_1d + MARGIN_1d),
        "MIN_1w": target - (DIFF_1w - MARGIN_1w),
        "MAX_1w": target - (DIFF_1w + MARGIN_1w),
    }
}

/// @notice Retrieve data at different time transformations (-5m, -1h, -1d, -1w)
///         from the last groStats timestamp
/// @param  targetTimestamp The last groStats timestamp loaded into the DB
/// @param  table The table to retrieve data from
/// @param  filter The filters to apply in the queries (eg.: product id, vault name..)
/// @return An object with data from target table at different points of time (time transf.)
const getTimestamps = async (
    targetTimestamp: number,
    table: string,
    filter: string[] | number[],
) => {
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

        if (current.status === QUERY_ERROR
            || diff_5m.status === QUERY_ERROR
            || diff_1h.status === QUERY_ERROR
            || diff_1d.status === QUERY_ERROR
            || diff_1w.status === QUERY_ERROR)
            throw `Query error in getTimestamps [targetTimestamp: ${targetTimestamp}]`;

        return {
            "current": current.rows[0],
            "diff_5m": diff_5m.rows[0],
            "diff_1h": diff_1h.rows[0],
            "diff_1d": diff_1d.rows[0],
            "diff_1w": diff_1w.rows[0],
        }
    } catch (err) {
        showError('groStatsHandlerMC.ts->getTimestamps()', err);
    }
}

/// @notice Get latest groStats timestamp loaded into the DB
const getMaxTimestamp = async () => {
    try {
        const res = await query(`select_max_timestamp_protocol_tvl.sql`, []);
        if (res.status === QUERY_ERROR)
            throw `Query error in getMaxTimestamp`;
        return res.rows[0];
    } catch (err) {
        showError('groStatsHandlerMC.ts->getMaxTimestamp()', err);
    }
}

/// @notice Get distinct names for vaults, reserves, strategies
const getDistincts = async (
    targetTimestamp: number,
    table: string,
) => {
    try {
        const res = await query(`select_distinct_${table}.sql`, [targetTimestamp]);
        if (res.status === QUERY_ERROR)
            throw `Query error in groStatsHandlerMC.ts->getDistincts() [targetTimestamp: ${targetTimestamp}]`;
        return res.rows;
    } catch (err) {
        showError('groStatsHandlerMC.ts->getDistincts()', err);
    }
}

/// @notice Calculates the KPIs by comparing latest data vs. same data 
///         at different points of time (transformations)
/// @param  root The target data (e.g.: tvl, apy, strategies, vaults)
/// @param  kpi The KPI to be calculated at different points of time (e.g.: tvl_pwrd, last3d_apy)
/// @return An object with all KPIs at different points of time
const calcKPI = (
    root: any, //TODO (dynamic)
    kpi: string
) => {
    try {
        const current = (root.current) ? parseFloat(root.current[kpi]) : null;
        const dif5m = (root.diff_5m) ? parseFloat(root.diff_5m[kpi]) : null;
        const dif1h = (root.diff_1h) ? parseFloat(root.diff_1h[kpi]) : null;
        const dif1d = (root.diff_1d) ? parseFloat(root.diff_1d[kpi]) : null;
        const dif1w = (root.diff_1w) ? parseFloat(root.diff_1w[kpi]) : null;
        return {
            [kpi]: current,
            [kpi + '_5m']: (root.diff_5m) ? dif5m : NA,
            [kpi + '_5m_dif']: (root.diff_5m) ? current - dif5m : NA,
            [kpi + '_1h']: (root.diff_1h) ? dif1h : NA,
            [kpi + '_1h_dif']: (root.diff_1h) ? current - dif1h : NA,
            [kpi + '_1d']: (root.diff_1d) ? dif1d : NA,
            [kpi + '_1d_dif']: (root.diff_1d) ? current - dif1d : NA,
            [kpi + '_1w']: (root.diff_1w) ? dif1w : NA,
            [kpi + '_1w_dif']: (root.diff_1w) ? current - dif1w : NA,
        }
    } catch (err) {
        showError('groStatsHandlerMC.ts->calcKPI()', err);
    }
}

const getTVL = async (targetTimestamp: number) => {
    try {
        const tvl = await getTimestamps(targetTimestamp, 'protocol_tvl', []);
        if (tvl.current) {
            return {
                "current_timestamp": tvl.current.current_timestamp,
                "current_date": tvl.current.current_date,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getTVL()', err);
    }
}

const getAvaxTVL = async (targetTimestamp: number) => {
    try {
        const tvl = await getTimestamps(targetTimestamp, 'protocol_avax_tvl', []);
        if (tvl.current) {
            return {
                "current_timestamp": tvl.current.current_timestamp,
                "current_date": tvl.current.current_date,
                ...calcKPI(tvl, 'labs_dai_vault'),
                ...calcKPI(tvl, 'labs_usdc_vault'),
                ...calcKPI(tvl, 'labs_usdt_vault'),
                ...calcKPI(tvl, 'labs_dai_vault_1_5'),
                ...calcKPI(tvl, 'labs_usdc_vault_1_5'),
                ...calcKPI(tvl, 'labs_usdt_vault_1_5'),
                ...calcKPI(tvl, 'labs_dai_vault_1_6'),
                ...calcKPI(tvl, 'labs_usdc_vault_1_6'),
                ...calcKPI(tvl, 'labs_usdt_vault_1_6'),
                ...calcKPI(tvl, 'labs_dai_vault_1_7'),
                ...calcKPI(tvl, 'labs_usdc_vault_1_7'),
                ...calcKPI(tvl, 'labs_usdt_vault_1_7'),
                ...calcKPI(tvl, 'total'),
            };
        } else {
            return {};
        }
    } catch (err) {
        showError('groStatsHandlerMC.ts->getAvaxTVL()', err);
    }
}

const getAPY = async (
    targetTimestamp: number,
    productId: number
) => {
    try {
        const apy = await getTimestamps(targetTimestamp, 'protocol_apy', [productId]);
        if (apy.current) {
            return {
                "current_timestamp": apy.current.current_timestamp,
                "current_date": apy.current.current_date,
                ...calcKPI(apy, 'apy_last24h'),
                ...calcKPI(apy, 'apy_last7d'),
                ...calcKPI(apy, 'apy_daily'),
                ...calcKPI(apy, 'apy_weekly'),
                ...calcKPI(apy, 'apy_monthly'),
                ...calcKPI(apy, 'apy_all_time'),
                ...calcKPI(apy, 'apy_current'),
            };
        } else {
            return {};
        }
    } catch (err) {
        showError('groStatsHandlerMC.ts->getAPY()', err);
    }
}

const getLifeguard = async (targetTimestamp: number) => {
    try {
        const lifeguard = await getTimestamps(targetTimestamp, 'protocol_lifeguard', []);
        if (lifeguard.current) {
            return {
                "current_timestamp": lifeguard.current.current_timestamp,
                "current_date": lifeguard.current.current_date,
                "name": lifeguard.current.name,
                "display_name": lifeguard.current.display_name,
                ...calcKPI(lifeguard, 'amount'),
                ...calcKPI(lifeguard, 'share'),
                ...calcKPI(lifeguard, 'last3d_apy'),
            };
        } else {
            return {};
        }
    } catch (err) {
        showError('groStatsHandlerMC.ts->getLifeguard()', err);
    }
}

const getSystem = async (targetTimestamp: number) => {
    try {
        const system = await getTimestamps(targetTimestamp, 'protocol_system', []);
        if (system.current) {
            return {
                "current_timestamp": system.current.current_timestamp,
                "current_date": system.current.current_date,
                ...calcKPI(system, 'total_share'),
                ...calcKPI(system, 'total_amount'),
                ...calcKPI(system, 'last3d_apy'),
                ...calcKPI(system, 'hodl_bonus'),
            };
        } else {
            return {};
        }
    } catch (err) {
        showError('groStatsHandlerMC.ts->getSystem()', err);
    }
}

const getSystemLifeguardStables = async (targetTimestamp: number) => {
    try {
        let result = [];
        const stables = await getDistincts(targetTimestamp, 'protocol_system_lifeguard_stables');
        if (stables.length > 0) {
            for (const item of stables) {
                const stable = await getTimestamps(targetTimestamp, 'protocol_system_lifeguard_stables', [item.name]);
                if (stable.current) {
                    result.push({
                        "current_timestamp": stable.current.current_timestamp,
                        "current_date": stable.current.current_date,
                        "name": stable.current.name,
                        ...calcKPI(stable, 'amount'),
                    });
                } else {
                    return {};
                }
            }
        } else {
            return {};
        }
        return result;
    } catch (err) {
        showError('groStatsHandlerMC.ts->getSystemLifeguardStables()', err);
    }
}

const getVaults = async (targetTimestamp: number) => {
    try {
        let result = [];
        const vaults = await getDistincts(targetTimestamp, 'protocol_vaults');
        if (vaults.length > 0) {
            for (const item of vaults) {
                const vault = await getTimestamps(targetTimestamp, 'protocol_vaults', [item.name]);
                if (vault.current) {
                    result.push({
                        "current_timestamp": vault.current.current_timestamp,
                        "current_date": vault.current.current_date,
                        "vault_name": vault.current.name,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getVaults()', err);
    }
}

const getAvaxVaults = async (targetTimestamp: number) => {
    try {
        let result = [];
        const vaults = await getDistincts(targetTimestamp, 'protocol_avax_vaults');
        if (vaults.length > 0) {
            for (const item of vaults) {
                const vault = await getTimestamps(targetTimestamp, 'protocol_avax_vaults', [item.name]);
                if (vault.current) {
                    result.push({
                        "current_timestamp": vault.current.current_timestamp,
                        "current_date": vault.current.current_date,
                        "vault_name": vault.current.name,
                        "display_name": vault.current.display_name,
                        "stablecoin": vault.current.display_name,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getAvaxVaults()', err);
    }
}

const getReserves = async (targetTimestamp: number) => {
    try {
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
                        "current_timestamp": reserve.current.current_timestamp,
                        "current_date": reserve.current.current_date,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getReserves()', err);
    }
}

const getAvaxReserves = async (targetTimestamp: number) => {
    try {
        let result = [];
        const reserves = await getDistincts(targetTimestamp, 'protocol_avax_reserves');
        if (reserves.length > 0) {
            for (const item of reserves) {
                const reserve = await getTimestamps(
                    targetTimestamp,
                    'protocol_avax_reserves',
                    [item.vault_name, item.reserve_name]
                );
                if (reserve.current) {
                    result.push({
                        "current_timestamp": reserve.current.current_timestamp,
                        "current_date": reserve.current.current_date,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getAvaxReserves()', err);
    }
}

const getStrategies = async (targetTimestamp: number) => {
    try {
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
                        "current_timestamp": strategy.current.current_timestamp,
                        "current_date": strategy.current.current_date,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getStrategies()', err);
    }
}

const getAvaxStrategies = async (targetTimestamp: number) => {
    try {
        let result = [];
        const strategies = await getDistincts(targetTimestamp, 'protocol_avax_strategies');
        if (strategies.length > 0) {
            for (const item of strategies) {
                const strategy = await getTimestamps(
                    targetTimestamp,
                    'protocol_avax_strategies',
                    [item.vault_name, item.strategy_name]
                );
                if (strategy.current) {
                    result.push({
                        "current_timestamp": strategy.current.current_timestamp,
                        "current_date": strategy.current.current_date,
                        "vault_name": strategy.current.vault_name,
                        "strategy_name": strategy.current.strategy_name,
                        "display_name": strategy.current.display_name,
                        "address": strategy.current.address,
                        ...calcKPI(strategy, 'amount'),
                        ...calcKPI(strategy, 'share'),
                        ...calcKPI(strategy, 'last3d_apy'),
                        ...calcKPI(strategy, 'all_time_apy'),
                        ...calcKPI(strategy, 'sharpe_ratio'),
                        ...calcKPI(strategy, 'sortino_ratio'),
                        ...calcKPI(strategy, 'romad_ratio'),
                    });
                } else {
                    return {};
                }
            }
        } else {
            return {};
        }
        return result;
    } catch (err) {
        showError('groStatsHandlerMC.ts->getAvaxStrategies()', err);
    }
}

const getExposureStables = async (targetTimestamp: number) => {
    try {
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
                        "current_timestamp": stable.current.current_timestamp,
                        "current_date": stable.current.current_date,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getExposureStables()', err);
    }
}

const getExposureProtocols = async (targetTimestamp: number) => {
    try {
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
                        "current_timestamp": protocol.current.current_timestamp,
                        "current_date": protocol.current.current_date,
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
    } catch (err) {
        showError('groStatsHandlerMC.ts->getExposureProtocols()', err);
    }
}

// if any getX() fails, the rest will provide data
// Provide data from the latest successful load
const getAllStatsMC = async () => {
    try {
        const res = await getMaxTimestamp();
        const targetTimestamp = res.current_timestamp;

        const [
            tvl,
            tvl_avax,
            apy1,
            apy2,
            // lifeguard,
            // lifeguardStables,
            system,
            vaults,
            vaults_avax,
            reserves,
            reserves_avax,
            strategies,
            strategies_avax,
            exposureStables,
            exposureProtocols,
        ] = await Promise.all([
            getTVL(targetTimestamp),
            getAvaxTVL(targetTimestamp),
            getAPY(targetTimestamp, 1),
            getAPY(targetTimestamp, 2),
            // getLifeguard(targetTimestamp),
            // getSystemLifeguardStables(targetTimestamp),
            getSystem(targetTimestamp),
            getVaults(targetTimestamp),
            getAvaxVaults(targetTimestamp),
            getReserves(targetTimestamp),
            getAvaxReserves(targetTimestamp),
            getStrategies(targetTimestamp),
            getAvaxStrategies(targetTimestamp),
            getExposureStables(targetTimestamp),
            getExposureProtocols(targetTimestamp),
        ]);

        if (targetTimestamp && targetTimestamp > 0)
            return {
                tvl: tvl,
                tvl_avax: tvl_avax,
                apy1: apy1,
                apy2: apy2,
                lifeguard: {}, //lifeguard,
                lifeguardStables: {}, //lifeguardStables,
                system: system,
                vaults: vaults,
                vaults_avax: vaults_avax,
                reserves: reserves,
                reserves_avax: reserves_avax,
                strategies: strategies,
                strategies_avax: strategies_avax,
                exposureStables: exposureStables,
                exposureProtocols: exposureProtocols,
                config: res,
            };
        return [];

    } catch (err) {
        showError('groStatsHandlerMC.ts->getAllStatsMC()', err);
    }
}

export {
    getAllStatsMC,
}
