"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPriceDetail = exports.getPriceGlobal = void 0;
const moment_1 = __importDefault(require("moment"));
const personalUtil_1 = require("../common/personalUtil");
const defaultData = (prices) => {
    return [
        prices.block_number,
        prices.current_timestamp,
        moment_1.default.unix(prices.current_timestamp),
        (0, personalUtil_1.getNetworkId)(),
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
        moment_1.default.utc(),
    ];
    return result;
};
exports.getPriceDetail = getPriceDetail;
const getPriceGlobal = (prices) => {
    return [
        ...defaultData(prices),
        prices.safety_check_bound,
        prices.safety_check,
        moment_1.default.utc(),
        (prices.oracle_check_tolerance ?
            parseFloat(prices.oracle_check_tolerance) / 100
            : 0),
        (prices.curve_check_tolerance ?
            parseFloat(prices.curve_check_tolerance) / 100 :
            0),
    ];
};
exports.getPriceGlobal = getPriceGlobal;
