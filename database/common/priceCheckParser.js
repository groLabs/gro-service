const moment = require('moment');
// const {
//     getNetworkId
// } = require('../common/personalUtil');
const statsTemp = require('./sample');
const stats = statsTemp.sample.pricing;

const defaultData = (stats2) => {
    return {
        "block_number": stats.block_number,
        "block_timestamp": 1,   //TODO: block_timestamp
        "block_date": moment(), //TODO: block_date   moment.unix(stats.current_timestamp).utc(),        
        "network_id": 3, //getNetworkId(),
    };
}

const getPriceGlobal = (stats2, kpi) => {
    const result = {
        ...defaultData(''),
        "pair": kpi,
        "curve_price": stats.curve[kpi],
        "curve_cache_price": stats.gro_cache[kpi],
        "curve_cache_diff": stats.curve_cache_diff[kpi],
        "curve_cache_check": stats.curve_cache_check[kpi],
        "chainlink_price": stats.chainlink[kpi],
        "curve_chainlink_diff": stats.curve_chainlink_diff[kpi],
        "curve_chainlink_check": stats.curve_chainlink_check[kpi],
        "creation_date": moment.utc(),
    }
    console.log('result:', result);
}

const getPriceDetail = (stats2) => {
    const result = {
        ...defaultData(''),
        "safety_check_bound": stats.safety_check_bound,
        "safety_check": stats.safety_check,
    }
    console.log('result2:', result);

}

const goPrice = () => {
    getPriceGlobal('', 'dai_usdc');
    getPriceGlobal('', 'dai_usdt');
    getPriceGlobal('', 'usdt_usdc');
    getPriceDetail('');
}

module.exports = {
    goPrice,
    getPriceGlobal,
    getPriceDetail,
}

