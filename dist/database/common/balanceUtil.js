const { BigNumber } = require('ethers');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { parseAmount } = require('../parser/personalStatsParser');
const { getConfig } = require('../../dist/common/configUtil');
const { getTokenCounter } = require('./contractUtil');
const UNI_POOL_GVT_GRO_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const UNI_POOL_GVT_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const BAL_POOL_GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');
const getBalances = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        const blockTag = { blockTag: blockNumber };
        const result = await getTokenCounter().getTokenAmounts(tokenAddress, userAddresses, blockTag);
        return [
            { amount_unstaked: result[0].map(unstaked => parseAmount(unstaked, 'USD')) },
            { amount_staked: result[1].map(staked => parseAmount(staked, 'USD')) }, // only for single-sided pools (gvt, gro)
        ];
    }
    catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalances(): ${err}`);
        return [];
    }
};
const getBalancesUniBalLP = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        let result = [];
        const blockTag = { blockTag: blockNumber };
        switch (tokenAddress) {
            case UNI_POOL_GVT_GRO_ADDRESS:
            case UNI_POOL_GVT_USDC_ADDRESS:
                result = await getTokenCounter().getLpAmountsUni(tokenAddress, userAddresses, blockTag);
                break;
            case BAL_POOL_GRO_WETH_ADDRESS:
                result = await getTokenCounter().getLpAmountsBalancer(tokenAddress, userAddresses, blockTag);
                break;
            default:
                logger.error(`**DB: Error in balanceUtil.js->getBalancesUniBalLP(): Unrecognised token address`);
                return [];
        }
        return [
            { amount_pooled_lp: result[0].map(pooled => parseAmount(pooled, 'USD')) },
            { amount_staked_lp: result[1].map(staked => parseAmount(staked, 'USD')) },
            { lp_position: result[2].map(lp_positions => [
                    parseAmount(lp_positions[0], 'USD'),
                    parseAmount(lp_positions[1], (tokenAddress === UNI_POOL_GVT_USDC_ADDRESS) ? 'USDC' : 'USD'),
                ])
            }
        ];
    }
    catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalancesUniBalLP(): ${err}`);
        return [];
    }
};
const getBalancesCrvLP = async (tokenAddress, userAddresses, blockNumber) => {
    try {
        const blockTag = { blockTag: blockNumber };
        const result = await getTokenCounter().getCurvePwrd(tokenAddress, userAddresses, blockTag);
        return [
            { amount_pooled_lp: result[0].map(pooled => parseAmount(pooled, 'USD')) },
            { amount_staked_lp: result[1].map(staked => parseAmount(staked, 'USD')) },
            { lp_position: result[2].map(lp_position => parseAmount(lp_position, 'USD')) }
        ];
    }
    catch (err) {
        logger.error(`**DB: Error in balanceUtil.js->getBalancesCrvLP(): ${err}`);
        return [];
    }
};
module.exports = {
    getBalances,
    getBalancesUniBalLP,
    getBalancesCrvLP,
};
// case GVT_ADDRESS:
//     const pricePerShareGVT = await getGroVault().getPricePerShare(blockTag);
//     for (const balance of balances) {
//         const value_unstaked = BigNumber.from(balance[0]).mul(BigNumber.from(pricePerShareGVT)).div(ONE);
//         const value_staked = BigNumber.from(balance[1]).mul(BigNumber.from(pricePerShareGVT)).div(ONE);
//         result.push([value_unstaked, value_staked]);
//     }
//     break;
