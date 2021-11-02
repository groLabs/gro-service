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


/// dev: ****** TokenCounter only available in mainnet from 26/10/2021
const loadUserBalances2 = async () => {
    try {

        const GVT_ADDRESS = await getGroVault().address;
        const PWRD_ADDRESS = await getPowerD().address;
        const GRO_ADDRESS = '0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7';
        const CRV_POOL_ADDRESS = '0xbcb91E689114B9Cc865AD7871845C95241Df4105';

        const res1 = await getBalances(
            GVT_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // MAT, SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13493374 // now
        );

        const res2 = await getBalances(
            PWRD_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // MAT, SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13493374 // now
        );
        /*
                const res3a = parseAmount(await getGroVault().getAssets(
                    '0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', // MAT
                    // '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD', // SJS
                    // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
                    // { blockTag: 13464125 }),
                    { blockTag: 13493374 }),
                    'USD');
        
                const res3b = parseAmount(await getPowerD().getAssets(
                    '0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', // MAT
                    // '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD', // SJS
                    // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
                    // { blockTag: 13464125 }),
                    { blockTag: 13493374 }),
                    'USD');
        */
        const res4 = await getBalances(
            CRV_POOL_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // MAT, SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            // 13464125  // EOD 21/10/2021
            13493374 // now
        );

        const res5 = await getBalances(
            GRO_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // MAT, SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13493374 // now
        );

        console.log('new gvt', res1);
        // console.log('old gvt', res3a);
        console.log('new pwrd', res2);
        // console.log('old pwrd', res3b);
        console.log('pwrd crv', res4);
        console.log('new gro', res5);

    } catch (err) {
        console.log('Errorin', err);
    }


}


/// @notice Load balances into USER_STD_FACT_BALANCES
/// @dev    Data is sourced from SC calls to users' balances at a certain block number
///         according to the dates provided
/// @param  fromDate Start date to load balances (date format: 'DD/MM/YYYY')
/// @param  toDdate End date to load balances (date format: 'DD/MM/YYYY')
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserBalances4 = async (
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

            let rowCount = 0;
            let rowExcluded = 0;

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
                    rowCount += result.rowCount;
                } else {
                    rowExcluded++;
                }

                // Staked amounts
                // TODO: rowCount, cache
                const q = 'insert_user_std_fact_balances_staked.sql';
                await query(q, stakedParams);

                // Pooled amounts
                // TODO: rowCount, cache
                const q2 = 'insert_user_std_fact_balances_pooled.sql';
                await query(q2, pooledParams);

            }
            let msg = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${isPlural(rowCount)} `;
            msg += `added into USER_STD_FACT_BALANCES `;
            msg += (rowExcluded !== 0) ? ` (excluded ${rowExcluded} with 0-balance) ` : '';
            msg += `for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
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

module.exports = {
    loadUserBalances2,
    loadUserBalances4,
};
