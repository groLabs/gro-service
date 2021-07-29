const moment = require('moment');
const { getNetworkId } = require('../common/personalUtil');


const defaultData = (prices) => {
    return [
        prices.block_number,
        prices.block_timestamp,
        moment.unix(prices.block_timestamp),  
        getNetworkId(),
    ];
}

const getPair = (kpi) => {
    switch (kpi) {
        case 'dai_usdc':
            return 1;
        case 'dai_usdt':
            return 2;
        case 'usdt_usdc':
            return 3;
        default:
            return 0;
    }
}

const getPriceDetail = (prices, kpi) => {
    const result2 = {
        ...defaultData(prices),
        "pair": kpi,
        "curve_price": prices.curve[kpi],
        "curve_cache_price": prices.gro_cache[kpi],
        "curve_cache_diff": prices.curve_cache_diff[kpi],
        "curve_cache_check": prices.curve_cache_check[kpi],
        "chainlink_price": prices.chainlink[kpi],
        "curve_chainlink_diff": prices.curve_chainlink_diff[kpi],
        "curve_chainlink_check": prices.curve_chainlink_check[kpi],
        "creation_date": moment.utc(),
    }
    console.log('result:', result2);
    const result = [
        ...defaultData(prices),
        getPair(kpi),
        prices.curve[kpi],
        prices.gro_cache[kpi],
        prices.curve_cache_diff[kpi],
        prices.curve_cache_check[kpi],
        prices.chainlink[kpi],
        prices.curve_chainlink_diff[kpi],
        prices.curve_chainlink_check[kpi],
        moment.utc(),
    ];
    console.log(result);
    return result;
}

const getPriceGlobal = (prices) => {
    return [
        ...defaultData(prices),
        prices.safety_check_bound,
        prices.safety_check,
        moment.utc(),
    ];
}

// const goPrice = (prices) => {
//     getPriceDetail(prices, 'dai_usdc');
//     getPriceDetail(prices, 'dai_usdt');
//     getPriceDetail(prices, 'usdt_usdc');
//     getPriceGlobal(prices);
// }

module.exports = {
    getPriceGlobal,
    getPriceDetail,
}

