"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalancesCrvLP = exports.getBalancesUniBalLP = exports.getBalances = exports.checkTime = void 0;
const moment_1 = __importDefault(require("moment"));
const personalStatsParser_1 = require("../parser/personalStatsParser");
const configUtil_1 = require("../../common/configUtil");
const contractUtil_1 = require("./contractUtil");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const UNI_POOL_GVT_GRO_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const UNI_POOL_GVT_USDC_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const BAL_POOL_GRO_WETH_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.balancer_gro_weth_pool_address');
/// @notice Check time format (if defined) and return hours, minutes & seconds
/// @dev    If time is not defined, return 23:59:59 by default
/// @param  time The target time to load balances [format: HH:mm:ss]
/// @return An array with 7 fixed positions: hours, minuts & seconds
const checkTime = (time) => {
    const isTimeOK = (0, moment_1.default)(time, 'HH:mm:ss', true).isValid();
    if (!time) {
        return [23, 59, 59];
    }
    else if (isTimeOK) {
        const hours = parseInt(time.substring(0, 2));
        const minutes = parseInt(time.substring(3, 5));
        const seconds = parseInt(time.substring(6, 8));
        return [hours, minutes, seconds];
    }
    else {
        logger.error(`**DB: Error in balanceUtil.js->checkTime(): invalid time format ${time}`);
        return [-1, -1, -1];
    }
};
exports.checkTime = checkTime;
const getBalances = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        const blockTag = { blockTag: blockNumber };
        const result = await (0, contractUtil_1.getTokenCounter)().getTokenAmounts(tokenAddress, userAddresses, blockTag);
        return [
            { amount_unstaked: result[0].map(unstaked => (0, personalStatsParser_1.parseAmount)(unstaked, 'USD')) },
            { amount_staked: result[1].map(staked => (0, personalStatsParser_1.parseAmount)(staked, 'USD')) }, // only for single-sided pools (gvt, gro)
        ];
    }
    catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalances(): ${err}`);
        return [];
    }
};
exports.getBalances = getBalances;
const getBalancesUniBalLP = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        let result = [];
        const blockTag = { blockTag: blockNumber };
        switch (tokenAddress) {
            case UNI_POOL_GVT_GRO_ADDRESS:
            case UNI_POOL_GVT_USDC_ADDRESS:
                result = await (0, contractUtil_1.getTokenCounter)().getLpAmountsUni(tokenAddress, userAddresses, blockTag);
                break;
            case BAL_POOL_GRO_WETH_ADDRESS:
                result = await (0, contractUtil_1.getTokenCounter)().getLpAmountsBalancer(tokenAddress, userAddresses, blockTag);
                break;
            default:
                logger.error(`**DB: Error in balanceUtil.js->getBalancesUniBalLP(): Unrecognised token address`);
                return [];
        }
        return [
            { amount_pooled_lp: result[0].map(pooled => (0, personalStatsParser_1.parseAmount)(pooled, 'USD')) },
            { amount_staked_lp: result[1].map(staked => (0, personalStatsParser_1.parseAmount)(staked, 'USD')) },
            { lp_position: result[2].map(lp_positions => [
                    (0, personalStatsParser_1.parseAmount)(lp_positions[0], 'USD'),
                    (0, personalStatsParser_1.parseAmount)(lp_positions[1], (tokenAddress === UNI_POOL_GVT_USDC_ADDRESS) ? 'USDC' : 'USD'),
                ])
            }
        ];
    }
    catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalancesUniBalLP(): ${err}`);
        return [];
    }
};
exports.getBalancesUniBalLP = getBalancesUniBalLP;
const getBalancesCrvLP = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        const blockTag = { blockTag: blockNumber };
        const result = await (0, contractUtil_1.getTokenCounter)().getCurvePwrd(tokenAddress, userAddresses, blockTag);
        return [
            { amount_pooled_lp: result[0].map(pooled => (0, personalStatsParser_1.parseAmount)(pooled, 'USD')) },
            { amount_staked_lp: result[1].map(staked => (0, personalStatsParser_1.parseAmount)(staked, 'USD')) },
            { lp_position: result[2].map(lp_position => (0, personalStatsParser_1.parseAmount)(lp_position, 'USD')) }
        ];
    }
    catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalancesCrvLP(): ${err}`);
        return [];
    }
};
exports.getBalancesCrvLP = getBalancesCrvLP;
