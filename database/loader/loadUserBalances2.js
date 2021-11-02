const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const { findBlockByDate } = require('../common/globalUtil');
const {
    generateDateRange,
    getNetworkId,
    handleErr,
    isPlural,
} = require('../common/personalUtil');
const { parseAmount } = require('../parser/personalStatsParser');
const {
    getGroVault,
    getPowerD,
    getTokenCounter,
} = require('../common/contractUtil');
const { QUERY_ERROR } = require('../constants');
const {
    getBalances,
    getBalancesUniBalLP,
    getBalancesCrvLP,
} = require('../common/balanceUtil');


const { getConfig } = require('../../common/configUtil');
const GRO_ADDRESS = getConfig('staker_pools.contracts.gro_address');
const GRO_GVT_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const GRO_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const CRV_PWRD_ADDRESS = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address');
const GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');

/// @notice Load balances into USER_STD_FACT_BALANCES
/// @dev    - Data is sourced from SC calls to users' balances at a certain block number
///         according to the dates provided
///         - TokenCounter SC only available in mainnet from 26/10/2021
/// @param  fromDate Start date to load balances (date format: 'DD/MM/YYYY')
/// @param  toDdate End date to load balances (date format: 'DD/MM/YYYY')
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserBalances2 = async (
    fromDate,
    toDate,
    account,
) => {
    try {
        // Get all distinct users with any transfer
        let res;
        let users;
        if (account) {
            res = {
                rowCount: 1,
                rows: [{
                    user_address: account
                }],
            }
        } else {
            res = await query('select_distinct_users_transfers.sql', []);
            if (res.status === QUERY_ERROR)
                return false;
        }

        // Extract value from object
        users = res.rows.map(key => key.user_address);

        // For each date, check each gvt & pwrd balance and insert data into USER_STD_FACT_BALANCES
        // TODO: *** select transfers where date < target date (for future data reloads)
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${res.rowCount} user balance${isPlural(res.rowCount)}...`);

        for (const date of dates) {

            const day = moment.utc(date, "DD/MM/YYYY")
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');

            let rowCountStaked = 0;
            let rowExcludedStaked = 0;
            let rowCountUnstaked = 0;
            let rowExcludedUnstaked = 0;
            let rowCountPooled = 0;
            let rowExcludedPooled = 0;

            const GVT_ADDRESS = getGroVault().address;
            const PWRD_ADDRESS = getPowerD().address;
            const block = (await findBlockByDate(day, false)).block;

            logger.info(`**DB: Checking balances in TokenCounter() for ${users.length} users...`);

            // TODO: perhaps make it recursive and build the arrays in buckets of 500?
            const [
                gvtValue,
                pwrdValue,
                groValue,
                lpGroGvt,
                lpGroUsdc,
                lpCrvPwrd,
                lpGroWeth,
            ] = await Promise.all([
                getBalances(GVT_ADDRESS, users, block),
                getBalances(PWRD_ADDRESS, users, block),
                getBalances(GRO_ADDRESS, users, block),
                getBalancesUniBalLP(GRO_GVT_ADDRESS, users, block),
                getBalancesUniBalLP(GRO_USDC_ADDRESS, users, block),
                getBalancesCrvLP(CRV_PWRD_ADDRESS, users, block),
                getBalancesUniBalLP(GRO_WETH_ADDRESS, users, block),
            ]);

            for (let i = 0; i < users.length; i++) {

                const addr = users[i];

                const isUnstakedBalance = (
                    gvtValue[0].amount_unstaked[i]
                    + pwrdValue[0].amount_unstaked[i]
                    + groValue[0].amount_unstaked[i]
                    > 0)
                    ? true
                    : false;

                const isStakedBalance = (
                    groValue[1].amount_staked[i]
                    + lpGroGvt[1].amount_staked_lp[i]
                    + lpGroUsdc[1].amount_staked_lp[i]
                    + gvtValue[1].amount_staked[i]
                    + lpCrvPwrd[1].amount_staked_lp[i]
                    + lpGroWeth[1].amount_staked_lp[i]
                    > 0)
                    ? true
                    : false;

                const isPooledBalance = (
                    lpGroGvt[0].amount_unstaked_lp[i] +
                    lpGroGvt[2].lp_position[i][0] +
                    lpGroGvt[2].lp_position[i][1] +
                    lpGroUsdc[0].amount_unstaked_lp[i] +
                    lpGroUsdc[2].lp_position[i][0] +
                    lpGroUsdc[2].lp_position[i][1] +
                    lpCrvPwrd[0].amount_unstaked_lp[0] +
                    lpCrvPwrd[2].lp_position[i] +
                    lpGroWeth[0].amount_unstaked_lp[i] +
                    lpGroWeth[2].lp_position[i][0] +
                    lpGroWeth[2].lp_position[i][1]
                    > 0)
                    ? true
                    : false;

                const unstakedParams = [
                    day,
                    getNetworkId(),
                    addr,
                    gvtValue[0].amount_unstaked[i],     // unstaked gvt amount
                    pwrdValue[0].amount_unstaked[i],    // unstaked pwrd amount
                    groValue[0].amount_unstaked[i],     // unstaked gro amount
                    moment.utc(),
                ];

                const stakedParams = [
                    day,
                    getNetworkId(),
                    addr,
                    groValue[1].amount_staked[i],       // pool0_staked_amount
                    lpGroGvt[1].amount_staked_lp[i],    // pool1_staked_amount
                    lpGroUsdc[1].amount_staked_lp[i],   // pool2_staked_amount
                    gvtValue[1].amount_staked[i],       // pool3_staked_amount
                    lpCrvPwrd[1].amount_staked_lp[i],   // pool4_staked_amount
                    lpGroWeth[1].amount_staked_lp[i],   // pool5_staked_amount
                    moment.utc(),
                ];

                const pooledParams = [
                    day,
                    getNetworkId(),
                    addr,
                    lpGroGvt[0].amount_unstaked_lp[i],  // pool1_lp_amount
                    lpGroGvt[2].lp_position[i][0],      // pool1_gro_amount
                    lpGroGvt[2].lp_position[i][1],      // pool1_gvt_amount
                    lpGroUsdc[0].amount_unstaked_lp[i], // pool2_lp_amount
                    lpGroUsdc[2].lp_position[i][0],     // pool2_gro_amount
                    lpGroUsdc[2].lp_position[i][1],     // pool2_usdc_amount
                    lpCrvPwrd[0].amount_unstaked_lp[0], // pool4_lp_amount
                    lpCrvPwrd[2].lp_position[i],        // poll4_pwrd_amount
                    lpGroWeth[0].amount_unstaked_lp[i], // pool5_lp_amount
                    lpGroWeth[2].lp_position[i][0],     // pool5_gro_amount
                    lpGroWeth[2].lp_position[i][1],     // pool5_weth_amount
                    moment.utc(),
                ];

                // Unstaked amounts
                if (isUnstakedBalance) {
                    const q = (account)
                        // ? 'insert_user_cache_fact_balances.sql'  // **** TODO ****
                        ? 'insert_user_std_fact_balances_unstaked.sql'  // **** for TESTING ONLY *****
                        : 'insert_user_std_fact_balances_unstaked.sql';
                    const result = await query(q, unstakedParams);
                    if (result.status === QUERY_ERROR)
                        return false;
                    rowCountUnstaked += result.rowCount;
                } else {
                    rowExcludedUnstaked++;
                }

                // Staked amounts
                // TODO: cache
                if (isStakedBalance) {
                    const q = 'insert_user_std_fact_balances_staked.sql';
                    const result = await query(q, stakedParams);
                    if (result.status === QUERY_ERROR)
                        return false;
                    rowCountStaked += result.rowCount;
                } else {
                    rowExcludedStaked++;
                }

                // Pooled amounts
                // TODO: cache
                if (isPooledBalance) {
                    const q = 'insert_user_std_fact_balances_pooled.sql';
                    const result = await query(q, pooledParams);
                    if (result.status === QUERY_ERROR)
                        return false;
                    rowCountPooled += result.rowCount;
                } else {
                    rowExcludedPooled++;
                }

            }

            showMsg(account, date, rowCountUnstaked, rowExcludedUnstaked, 'USER_STD_FACT_BALANCES_UNSTAKED');
            showMsg(account, date, rowCountStaked, rowExcludedStaked, 'USER_STD_FACT_BALANCES_STAKED');
            showMsg(account, date, rowCountPooled, rowExcludedPooled, 'USER_STD_FACT_BALANCES_POOLED');
        }
        // Update table SYS_USER_LOADS with the last loads
        if (account) {
            return true;
        } else {
            const res = await loadTableUpdates('USER_STD_FACT_BALANCES', fromDate, toDate);
            return (res) ? true : false;
        }
    } catch (err) {
        handleErr(`loadUserBalances->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

const showMsg = (account, date, rowCount, rowExcluded, table) => {
    let msg3 = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${isPlural(rowCount)} `;
    msg3 += `added into ${table} `;
    msg3 += (rowExcluded !== 0) ? `(excluded ${rowExcluded} with 0-balance) ` : '';
    msg3 += `for date ${moment(date).format('DD/MM/YYYY')}`;
    logger.info(msg3);
}

module.exports = {
    loadUserBalances2,
};
