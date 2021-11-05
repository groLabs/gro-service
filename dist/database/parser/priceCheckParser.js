"use strict";
const moment = require('moment');
const { getNetworkId } = require('../common/personalUtil');
const defaultData = (prices) => {
    return [
        prices.block_number,
        prices.current_timestamp,
        moment.unix(prices.current_timestamp),
        getNetworkId(),
    ];
};
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
};
const getPriceDetail = (prices, kpi) => {
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
    return result;
};
const getPriceGlobal = (prices) => {
    return [
        ...defaultData(prices),
        prices.safety_check_bound,
        prices.safety_check,
        moment.utc(),
        (prices.oracle_check_tolerance ?
            parseFloat(prices.oracle_check_tolerance) / 100
            : 0),
        (prices.curve_check_tolerance ?
            parseFloat(prices.curve_check_tolerance) / 100 :
            0),
    ];
};
module.exports = {
    getPriceGlobal,
    getPriceDetail,
};
