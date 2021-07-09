// const botEnv = process.env.BOT_ENV.toLowerCase();
// const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
//const { query } = require('../handler/queryHandler');
// const {
//     QUERY_ERROR,
//     getBlockData,
//     getNetworkId,
//     handleErr,
//     isPlural,

// const {
//     getNetworkId
// } = require('../common/personalUtil');

/* TEST VALUES */
const stats = {"current_timestamp":"1625765886","launch_timestamp":"1624827717","network":"ropsten","apy":{"last24h":{"pwrd":"0.016425","gvt":"-185.939760"},"last7d":{"pwrd":"0.130832","gvt":"-26.396916"},"daily":{"pwrd":"0.067160","gvt":"0.067160"},"weekly":{"pwrd":"0.167336","gvt":"0.233688"},"monthly":{"pwrd":"0.239900","gvt":"0.286012"},"all_time":{"pwrd":"0.239900","gvt":"0.286012"},"hodl_bonus":"0.065312","current":{"pwrd":"0.098096","gvt":"0.164552"}},"tvl":{"pwrd":"72250.4670805","gvt":"108751.0034513","total":"181001.4705318","util_ratio":"0.664365","util_ratio_limit_PD":"0.600000","util_ratio_limit_GW":"0.950000"},"system":{"total_share":"0.999998","total_amount":"181001.3649338","last3d_apy":"0.072713","lifeguard":{"name":"3CRV","amount":"1776.8233064","share":"0.009816","last3d_apy":"0.000000"},"vaults":[{"name":"DAI yVault","amount":"80971.1935806","share":"0.447351","last3d_apy":"0.000000","strategies":[{"name":"Idle","amount":"52037.8447872","last3d_apy":"0.098842","share":"0.287499"},{"name":"Cream","amount":"16119.1366162","last3d_apy":"0.097904","share":"0.089055"},{"name":"DAI","amount":"12814.2935981","last3d_apy":"0.000000","share":"0.070796"}]},{"name":"USDC yVault","amount":"71002.9416699","share":"0.392278","last3d_apy":"0.000000","strategies":[{"name":"Idle","amount":"54910.5354894","last3d_apy":"0.101739","share":"0.303370"},{"name":"Cream","amount":"13123.8366989","last3d_apy":"0.065000","share":"0.072506"},{"name":"USDC","amount":"2968.5957601","last3d_apy":"0.000000","share":"0.016400"}]},{"name":"USDT yVault","amount":"495.0858295","share":"0.002735","last3d_apy":"0.000000","strategies":[{"name":"Idle","amount":"0.0000000","last3d_apy":"0.096341","share":"0.000000"},{"name":"Cream","amount":"0.0000000","last3d_apy":"0.090278","share":"0.000000"},{"name":"USDT","amount":"495.0858295","last3d_apy":"0.000000","share":"0.002735"}]},{"name":"Curve yVault","amount":"26755.3205473","share":"0.147818","last3d_apy":"0.000000","strategies":[{"name":"XPool","amount":"26755.3205473","last3d_apy":"0.000000","share":"0.147818"},{"name":"3CRV","amount":"0.0000000","last3d_apy":"0.000000","share":"0.000000"}]}]},"exposure":{"stablecoins":[{"name":"DAI","concentration":"0.599300"},{"name":"USDC","concentration":"0.685000"},{"name":"USDT","concentration":"0.150500"}],"protocols":[{"name":"Idle","concentration":"0.590869"},{"name":"Compound","concentration":"0.590869"},{"name":"Cream","concentration":"0.161561"},{"name":"Curve","concentration":"0.147818"}]}}
const getNetworkId = () => 3;
const QUERY_ERROR = 400;
const getProductId = (product) => {
    return (product === 'pwrd' ? 1 : 2);
}


const defaultData = [
    stats.launch_timestamp,
    moment.unix(stats.launch_timestamp).utc(),
    getNetworkId(),
];

const getAPY = (product) => {
    const result = [
        ...defaultData,
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

const getTVL = () => {
    const result = [
        ...defaultData,
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

const getSystem = () => {
    const result = [
        ...defaultData,
        stats.system.total_share,
        stats.system.total_amount,
        stats.system.last3d_apy,
        stats.apy.hodl_bonus,
        moment().utc(),
    ];
    return result;
}

const getLifeguard = () => {
    const result = [
        ...defaultData,
        stats.system.lifeguard.name,
        stats.system.lifeguard.amount,
        stats.system.lifeguard.share,
        stats.system.lifeguard.last3d_apy,
        moment().utc(),
    ];
    return result;
}

const getVaults = () => {
    let result = [];
    for (const vault of stats.system.vaults) {
        result.push([
            ...defaultData,
            vault.name,
            vault.amount,
            vault.share,
            vault.last3d_apy,
            moment().utc(),
        ]);
    }
    return result;
}

const getStrategies = () => {
    let result = [];
    for (const vault of stats.system.vaults) {
        for (const strategy of vault.strategies) {
            result.push([
                ...defaultData,
                vault.name,
                strategy.name,
                strategy.amount,
                strategy.share,
                strategy.last3d_apy,
                moment().utc(),
            ]);
        }
    }
    return result;
}

const getExposureStables = () => {
    let result = [];
    for (const stablecoin of stats.exposure.stablecoins) {
        result.push([
            ...defaultData,
            stablecoin.name,
            stablecoin.concentration,
            moment().utc(),
        ]);
    }
    return result;
}

const getExposureProtocols = () => {
    let result = [];
    for (const protocol of stats.exposure.protocols) {
        result.push([
            ...defaultData,
            protocol.name,
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
    getStrategies,
    getExposureStables,
    getExposureProtocols,
}
