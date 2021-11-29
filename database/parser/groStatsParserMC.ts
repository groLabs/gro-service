import moment from 'moment';
import { NETWORK, NETWORK_ID, PRODUCT, PRODUCT_ID } from '../constants';
import { getNetworkId } from '../common/personalUtil';


const defaultData = (stats, network: NETWORK) => {
    const networkId = (network === NETWORK.MAINNET)
        ? getNetworkId()
        : (network === NETWORK.AVALANCHE)
            ? NETWORK_ID.AVALANCHE
            : -1;

    return [
        stats.current_timestamp,
        moment.unix(stats.current_timestamp).utc(),
        networkId,
    ];
};

const getAPY = (stats, network: NETWORK, product: PRODUCT, productId: PRODUCT_ID) => {
    const result = [
        ...defaultData(stats, network),
        productId,
        stats[network].apy.last24h
            ? stats[network].apy.last24h[product]
            : null,
        stats[network].apy.last7d
            ? stats[network].apy.last7d[product]
            : null,
        stats[network].apy.daily
            ? stats[network].apy.daily[product]
            : null,
        stats[network].apy.weekly
            ? stats[network].apy.weekly[product]
            : null,
        stats[network].apy.monthly
            ? stats[network].apy.monthly[product]
            : null,
        stats[network].apy.all_time
            ? stats[network].apy.all_time[product]
            : null,
        stats[network].apy.current
            ? stats[network].apy.current[product]
            : null,
        moment().utc(),
    ];
    return result;
}

const getTVL = (stats, network: NETWORK) => {
    let data = [];
    if (network === 'mainnet') {
        data = [
            stats[network].tvl.pwrd
                ? stats[network].tvl.pwrd
                : null,
            stats[network].tvl.gvt
                ? stats[network].tvl.gvt
                : null,
            stats[network].tvl.total
                ? stats[network].tvl.total
                : null,
            stats[network].tvl.util_ratio
                ? stats[network].tvl.util_ratio
                : null,
            stats[network].tvl.util_ratio_limit_PD
                ? stats[network].tvl.util_ratio_limit_PD
                : null,
            stats[network].tvl.util_ratio_limit_GW
                ? stats[network].tvl.util_ratio_limit_GW
                : null,
        ];
    } else if (network === 'avalanche') {
        data = [
            stats[network].tvl.labs_dai_vault
                ? stats[network].tvl.labs_dai_vault
                : null,
            stats[network].tvl.labs_usdc_vault
                ? stats[network].tvl.labs_usdc_vault
                : null,
            stats[network].tvl.labs_usdt_vault
                ? stats[network].tvl.labs_usdt_vault
                : null,
            stats[network].tvl.total
                ? stats[network].tvl.total
                : null,
        ];
    } else {
        return [];
    }
    const result = [
        ...defaultData(stats, network),
        ...data,
        moment().utc(),
    ];
    return result;
}

const getSystem = (stats, network: NETWORK) => {
    const result = [
        ...defaultData(stats, network),
        stats[network].system.total_share
            ? stats[network].system.total_share
            : null,
        stats[network].system.total_amount
            ? stats[network].system.total_amount
            : null,
        stats[network].system.last3d_apy
            ? stats[network].system.last3d_apy
            : null,
        stats[network].apy.hodl_bonus
            ? stats[network].apy.hodl_bonus
            : null,
        moment().utc(),
    ];
    return result;
}

const getLifeguard = (stats, network: NETWORK) => {
    const result = [
        ...defaultData(stats, network),
        stats[network].system.lifeguard.name
            ? stats[network].system.lifeguard.name
            : null,
        stats[network].system.lifeguard.display_name
            ? stats[network].system.lifeguard.display_name
            : null,
        stats[network].system.lifeguard.amount
            ? stats[network].system.lifeguard.amount
            : null,
        stats[network].system.lifeguard.share
            ? stats[network].system.lifeguard.share
            : null,
        stats[network].system.lifeguard.last3d_apy
            ? stats[network].system.lifeguard.last3d_apy
            : null,
        moment().utc(),
    ];
    return result;
}

const getLifeguardStables = (stats, network: NETWORK) => {
    let result = [];
    for (const protocol of stats[network].system.lifeguard.stablecoins) {
        result.push([
            ...defaultData(stats, network),
            protocol.name
                ? protocol.name
                : null,
            protocol.display_name
                ? protocol.display_name
                : null,
            protocol.amount
                ? protocol.amount
                : null,
            moment().utc(),
        ]);
    }
    return result;
}

const getVaults = (stats, network: NETWORK) => {
    let result = [];

    if (network === 'mainnet') {
        for (const vault of stats[network].system.vault) {
            result.push([
                ...defaultData(stats, network),
                vault.name
                    ? vault.name
                    : null,
                vault.display_name
                    ? vault.display_name
                    : null,
                vault.amount
                    ? vault.amount
                    : null,
                vault.share
                    ? vault.share
                    : null,
                vault.last3d_apy
                    ? vault.last3d_apy
                    : null,
                moment().utc(),
            ]);
        }
    } else if (network === 'avalanche') {
        for (const labsVault of stats[network].labs_vault) {
            result.push([
                ...defaultData(stats, network),
                labsVault.name
                    ? labsVault.name
                    : null,
                labsVault.display_name
                    ? labsVault.display_name
                    : null,
                labsVault.stablecoin
                    ? labsVault.stablecoin
                    : null,
                labsVault.amount
                    ? labsVault.amount
                    : null,
                labsVault.share
                    ? labsVault.share
                    : null,
                labsVault.last3d_apy
                    ? labsVault.last3d_apy
                    : null,
                moment().utc(),
            ]);
        }
    } else {
        return [];
    }
    return result;
}

const getReserves = (stats, network: NETWORK) => {
    let result = [];

    const reserves = (network === 'mainnet')
        ? stats[network].system.vault
        : (network === 'avalanche')
            ? stats[network].labs_vault
            : [];

    for (const reserve of reserves) {
        result.push([
            ...defaultData(stats, network),
            reserve.name
                ? reserve.name
                : null,
            reserve.reserves.name
                ? reserve.reserves.name
                : null,
            reserve.reserves.display_name
                ? reserve.reserves.display_name
                : null,
            reserve.reserves.amount
                ? reserve.reserves.amount
                : null,
            reserve.reserves.share
                ? reserve.reserves.share
                : null,
            reserve.reserves.last3d_apy
                ? reserve.reserves.last3d_apy
                : null,
            moment().utc(),
        ]);
    }

    return result;
}

const getStrategies = (stats, network: NETWORK) => {
    let result = [];

    if (network === NETWORK.MAINNET) {
        for (const vault of stats[network].system.vault) {
            for (const strategy of vault.strategies) {
                result.push([
                    ...defaultData(stats, network),
                    vault.name
                        ? vault.name
                        : null,
                    strategy.name
                        ? strategy.name
                        : null,
                    strategy.display_name
                        ? strategy.display_name
                        : null,
                    strategy.address
                        ? strategy.address
                        : null,
                    strategy.amount
                        ? strategy.amount
                        : null,
                    strategy.share
                        ? strategy.share
                        : null,
                    strategy.last3d_apy
                        ? strategy.last3d_apy
                        : null,
                    moment().utc(),
                ]);
            }
        }
    } else if (network === NETWORK.AVALANCHE) {
        for (const vault of stats[network].labs_vault) {
            for (const strategy of vault.strategies) {
                result.push([
                    ...defaultData(stats, network),
                    vault.name
                        ? vault.name
                        : null,
                    strategy.name
                        ? strategy.name
                        : null,
                    strategy.display_name
                        ? strategy.display_name
                        : null,
                    strategy.address
                        ? strategy.address
                        : null,
                    strategy.amount
                        ? strategy.amount
                        : null,
                    strategy.share
                        ? strategy.share
                        : null,
                    strategy.last3d_apy
                        ? strategy.last3d_apy
                        : null,
                    strategy.all_time_apy
                        ? strategy.all_time_apy
                        : null,
                    strategy.sharpe_ratio
                        ? strategy.sharpe_ratio
                        : null,
                    strategy.sortino_ratio
                        ? strategy.sortino_ratio
                        : null,
                    strategy.romad_ratio
                        ? strategy.romad_ratio
                        : null,
                    // strategy.open_position // TODO: needed?
                    //     ? strategy.open_position
                    //     : null,
                    // strategy.past_5_closed_positions // TODO: needed?
                    //     ? strategy.past_5_closed_positions
                    //     : null,
                    moment().utc(),
                ]);
            }
        }
    } else {
        return [];
    }
    return result;
}

const getExposureStables = (stats, network: NETWORK) => {
    let result = [];
    for (const stablecoin of stats[network].exposure.stablecoins) {
        result.push([
            ...defaultData(stats, network),
            stablecoin.name
                ? stablecoin.name
                : null,
            stablecoin.display_name
                ? stablecoin.display_name
                : null,
            stablecoin.concentration
                ? stablecoin.concentration
                : null,
            moment().utc(),
        ]);
    }
    return result;
}

const getExposureProtocols = (stats, network: NETWORK) => {
    let result = [];
    for (const protocol of stats[network].exposure.protocols) {
        result.push([
            ...defaultData(stats, network),
            protocol.name
                ? protocol.name
                : null,
            protocol.display_name
                ? protocol.display_name
                : null,
            protocol.concentration
                ? protocol.concentration
                : null,
            moment().utc(),
        ]);
    }
    return result;
}

export {
    getAPY,
    getTVL,
    getSystem,
    getLifeguard,
    getLifeguardStables,
    getVaults,
    getReserves,
    getStrategies,
    getExposureStables,
    getExposureProtocols,
}
