// import { BigNumber } from 'ethers';
import moment from 'moment';
import { parseAmount } from '../common/globalUtil';
import { getConfig } from '../../common/configUtil';
import { getTokenCounter } from './contractUtil';
import { Base } from '../types';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

const UNI_POOL_GVT_GRO_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const UNI_POOL_GVT_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const BAL_POOL_GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');


/// @notice Check time format (if defined) and return hours, minutes & seconds
/// @dev    If time is not defined, return 23:59:59 by default
/// @param  time The target time to load balances [format: HH:mm:ss]
/// @return An array with 7 fixed positions: hours, minutes & seconds
const checkTime = (time: string): number[] => {
    const isTimeOK = moment(time, 'HH:mm:ss', true).isValid();
    if (!time) {
        return [23, 59, 59];
    } else if (isTimeOK) {
        const hours = parseInt(time.substring(0, 2));
        const minutes = parseInt(time.substring(3, 5));
        const seconds = parseInt(time.substring(6, 8));
        return [hours, minutes, seconds];
    } else {
        logger.error(`**DB: Error in balanceUtil.ts->checkTime(): invalid time format ${time}`);
        return [-1, -1, -1];
    }
}

const getBalances = async (
    tokenAddress,
    userAddresses,
    blockNumber
) => {
    try {
        const blockTag = { blockTag: blockNumber };

        const result = await getTokenCounter().getTokenAmounts(
            tokenAddress,
            userAddresses,
            blockTag,
        );

        return [
            { amount_unstaked: result[0].map(unstaked => parseAmount(unstaked, Base.D18)) },
            { amount_staked: result[1].map(staked => parseAmount(staked, Base.D18)) }, // only for single-sided pools (gvt, gro)
        ];
    } catch (err) {
        logger.error(`**DB: Error in balanceUtil.ts->getBalances(): ${err}`);
        return [];
    }
}

const getBalancesUniBalLP = async (
    tokenAddress,
    userAddresses,
    blockNumber
) => {
    try {
        let result = [];
        const blockTag = { blockTag: blockNumber };
        switch (tokenAddress) {
            case UNI_POOL_GVT_GRO_ADDRESS:
            case UNI_POOL_GVT_USDC_ADDRESS:
                result = await getTokenCounter().getLpAmountsUni(
                    tokenAddress,
                    userAddresses,
                    blockTag,
                );
                break;
            case BAL_POOL_GRO_WETH_ADDRESS:
                result = await getTokenCounter().getLpAmountsBalancer(
                    tokenAddress,
                    userAddresses,
                    blockTag,
                );
                break;
            default:
                logger.error(`**DB: Error in balanceUtil.ts->getBalancesUniBalLP(): Unrecognised token address`);
                return [];
        }
        return [
            { amount_pooled_lp: result[0].map(pooled => parseAmount(pooled, Base.D18)) },
            { amount_staked_lp: result[1].map(staked => parseAmount(staked, Base.D18)) },
            {
                lp_position: result[2].map(
                    lp_positions => [
                        parseAmount(lp_positions[0], Base.D18),
                        parseAmount(lp_positions[1], (tokenAddress === UNI_POOL_GVT_USDC_ADDRESS) ? Base.D6 : Base.D18),
                    ])
            }
        ];
    } catch (err) {
        logger.error(`**DB: Error in balanceUtil.ts->getBalancesUniBalLP(): ${err}`);
        return [];
    }
}

const getBalancesCrvLP = async (
    tokenAddress,
    userAddresses,
    blockNumber
) => {
    try {
        const blockTag = { blockTag: blockNumber };
        const result = await getTokenCounter().getCurvePwrd(
            tokenAddress,
            userAddresses,
            blockTag,
        );
        return [
            { amount_pooled_lp: result[0].map(pooled => parseAmount(pooled, Base.D18)) },
            { amount_staked_lp: result[1].map(staked => parseAmount(staked, Base.D18)) },
            { lp_position: result[2].map(lp_position => parseAmount(lp_position, Base.D18)) }
        ];
    } catch (err) {
        logger.error(`**DB: Error in balanceUtil.ts->getBalancesCrvLP(): ${err}`);
        return [];
    }
}

export {
    checkTime,
    getBalances,
    getBalancesUniBalLP,
    getBalancesCrvLP,
}




            // case GVT_ADDRESS:
            //     const pricePerShareGVT = await getGroVault().getPricePerShare(blockTag);
            //     for (const balance of balances) {
            //         const value_unstaked = BigNumber.from(balance[0]).mul(BigNumber.from(pricePerShareGVT)).div(ONE);
            //         const value_staked = BigNumber.from(balance[1]).mul(BigNumber.from(pricePerShareGVT)).div(ONE);
            //         result.push([value_unstaked, value_staked]);
            //     }
            //     break;
