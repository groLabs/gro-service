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
const { BALANCES_BATCH: BATCH } = require('../constants');


const { getConfig } = require('../../common/configUtil');
const GRO_ADDRESS = getConfig('staker_pools.contracts.gro_address');
const GRO_GVT_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const GRO_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const CRV_PWRD_ADDRESS = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address');
const GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');


const getBalancesSC = async (users, block, offset, gvt, pwrd, gro, lpGroGvt, lpGroUsdc, lpCrvPwrd, lpGroWeth) => {
    try {

        const newOffset = (offset + BATCH >= users.length)
            ? users.length
            : offset + BATCH;

        const userBatch = users.slice(offset, newOffset);

        logger.info(`**DB: Reading balances from TokenCounter() in block ${block} for users ${offset} to ${newOffset}...`);

        const [
            gvtUpdate,
            pwrdUpdate,
            groUpdate,
            lpGroGvtUpdate,
            lpGroUsdcUpdate,
            lpCrvPwrdUpdate,
            lpGroWethUpdate,
        ] = await Promise.all([
            getBalances(getGroVault().address, userBatch, block),
            getBalances(getPowerD().address, userBatch, block),
            getBalances(GRO_ADDRESS, userBatch, block),
            getBalancesUniBalLP(GRO_GVT_ADDRESS, userBatch, block),
            getBalancesUniBalLP(GRO_USDC_ADDRESS, userBatch, block),
            getBalancesCrvLP(CRV_PWRD_ADDRESS, userBatch, block),
            getBalancesUniBalLP(GRO_WETH_ADDRESS, userBatch, block),
        ]);

        if (gvt.length === 0) {
            gvt = gvtUpdate;
            pwrd = pwrdUpdate;
            gro = groUpdate;
            lpGroGvt = lpGroGvtUpdate;
            lpGroUsdc = lpGroUsdcUpdate;
            lpCrvPwrd = lpCrvPwrdUpdate;
            lpGroWeth = lpGroWethUpdate;
        } else {
            gvt[0].amount_unstaked.push(...gvtUpdate[0].amount_unstaked);
            gvt[1].amount_staked.push(...gvtUpdate[1].amount_staked);
            pwrd[0].amount_unstaked.push(...pwrdUpdate[0].amount_unstaked);
            pwrd[1].amount_staked.push(...pwrdUpdate[1].amount_staked);
            gro[0].amount_unstaked.push(...groUpdate[0].amount_unstaked);
            gro[1].amount_staked.push(...groUpdate[1].amount_staked);
            lpGroGvt[0].amount_unstaked_lp.push(...lpGroGvtUpdate[0].amount_unstaked_lp);
            lpGroGvt[1].amount_staked_lp.push(...lpGroGvtUpdate[1].amount_staked_lp);
            lpGroGvt[2].lp_position.push(...lpGroGvtUpdate[2].lp_position);
            lpGroUsdc[0].amount_unstaked_lp.push(...lpGroUsdcUpdate[0].amount_unstaked_lp);
            lpGroUsdc[1].amount_staked_lp.push(...lpGroUsdcUpdate[1].amount_staked_lp);
            lpGroUsdc[2].lp_position.push(...lpGroUsdcUpdate[2].lp_position);
            lpCrvPwrd[0].amount_unstaked_lp.push(...lpCrvPwrdUpdate[0].amount_unstaked_lp);
            lpCrvPwrd[1].amount_staked_lp.push(...lpCrvPwrdUpdate[1].amount_staked_lp);
            lpCrvPwrd[2].lp_position.push(...lpCrvPwrdUpdate[2].lp_position);
            lpGroWeth[0].amount_unstaked_lp.push(...lpGroWethUpdate[0].amount_unstaked_lp);
            lpGroWeth[1].amount_staked_lp.push(...lpGroWethUpdate[1].amount_staked_lp);
            lpGroWeth[2].lp_position.push(...lpGroWethUpdate[2].lp_position);
        }

        return (newOffset >= users.length)
            ? [gvt, pwrd, gro, lpGroGvt, lpGroUsdc, lpCrvPwrd, lpGroWeth]
            : getBalancesSC(users, block, newOffset, gvt, pwrd, gro, lpGroGvt, lpGroUsdc, lpCrvPwrd, lpGroWeth);

    } catch (err) {
        handleErr(`loadUserBalances2->getBalancesSC()`, err);
        // return [] ?
    }
}

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
    time,
) => {
    try {
        let hours, minutes, seconds;
        // TODO: replace by config/registry data (this is mainnet deployment)
        const tokenCounterStartDate = moment.utc('26/10/2021', 'DD/MM/YYYY')
            .add(10, 'hours')
            .add(55, 'minutes')
            .add(42, 'seconds');

        const isTimeOK = moment(time, 'HH:mm:ss', true).isValid();
        if (!time) {
            hours = 23;
            minutes = 59;
            seconds = 59;
        } else if (isTimeOK) {
            hours = parseInt(time.substring(0, 2));
            minutes = parseInt(time.substring(3, 5));
            seconds = parseInt(time.substring(6, 8));
        } else {
            handleErr(`loadUserBalances2->loadUserBalances2(): invalid time format`, time);
            return false;
        }

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
            // TODO: select distinct transfers where day <= target date (for future data reloads)
            res = await query('select_distinct_users_transfers.sql', []);
            if (res.status === QUERY_ERROR)
                return false;
        }

        // Extract value from array of object [user_address: 0x...]
        users = res.rows.map(key => key.user_address);

        // For each date, check each gvt & pwrd balance and insert data into USER_STD_FACT_BALANCES*
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${users.length} user balance${isPlural(users.length)}...`);

        for (const date of dates) {

            const day = moment.utc(date, "DD/MM/YYYY")
                .add(hours, 'hours')
                .add(minutes, 'minutes')
                .add(seconds, 'seconds');

            // Check if day >= deployment date of TokenCounter SC
            if (!day.isSameOrAfter(tokenCounterStartDate)) {
                const msg = `target date [${day}] before TokenCounter date [${tokenCounterStartDate}]`;
                logger.error(`loadUserBalances2->loadUserBalances2(): ${msg}`);
                return false;
            }

            let rowCountStaked = 0;
            let rowExcludedStaked = 0;
            let rowCountUnstaked = 0;
            let rowExcludedUnstaked = 0;
            let rowCountPooled = 0;
            let rowExcludedPooled = 0;

            const block = (await findBlockByDate(day, false)).block;

            const [
                gvt,
                pwrd,
                gro,
                lpGroGvt,
                lpGroUsdc,
                lpCrvPwrd,
                lpGroWeth
            ] = await getBalancesSC(users, block, 0, [], [], [], [], [], [], []);

            for (let i = 0; i < users.length; i++) {

                const addr = users[i];

                const isUnstakedBalance = (
                    gvt[0].amount_unstaked[i]
                    + pwrd[0].amount_unstaked[i]
                    + gro[0].amount_unstaked[i]
                    > 0)
                    ? true
                    : false;

                const isStakedBalance = (
                    gro[1].amount_staked[i]
                    + lpGroGvt[1].amount_staked_lp[i]
                    + lpGroUsdc[1].amount_staked_lp[i]
                    + gvt[1].amount_staked[i]
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
                    lpCrvPwrd[0].amount_unstaked_lp[i] +
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
                    gvt[0].amount_unstaked[i],     // unstaked gvt amount
                    pwrd[0].amount_unstaked[i],    // unstaked pwrd amount
                    gro[0].amount_unstaked[i],     // unstaked gro amount
                    moment.utc(),
                ];

                const stakedParams = [
                    day,
                    getNetworkId(),
                    addr,
                    gro[1].amount_staked[i],            // pool0_staked_amount
                    lpGroGvt[1].amount_staked_lp[i],    // pool1_staked_amount
                    lpGroUsdc[1].amount_staked_lp[i],   // pool2_staked_amount
                    gvt[1].amount_staked[i],            // pool3_staked_amount
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
                    lpCrvPwrd[0].amount_unstaked_lp[i], // pool4_lp_amount
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
                if (isStakedBalance) {
                    // TODO: add cache query
                    const q = 'insert_user_std_fact_balances_staked.sql';
                    const result = await query(q, stakedParams);
                    if (result.status === QUERY_ERROR)
                        return false;
                    rowCountStaked += result.rowCount;
                } else {
                    rowExcludedStaked++;
                }

                // Pooled amounts
                if (isPooledBalance) {
                    // TODO: add cache query
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
            const [
                resUnStaked,
                resStaked,
                resPooled
            ] = await Promise.all([
                loadTableUpdates('USER_STD_FACT_BALANCES_UNSTAKED', fromDate, toDate),
                loadTableUpdates('USER_STD_FACT_BALANCES_STAKED', fromDate, toDate),
                loadTableUpdates('USER_STD_FACT_BALANCES_POOLED', fromDate, toDate)
            ]);
            return (resUnStaked && resStaked && resPooled) ? true : false;
        }

    } catch (err) {
        handleErr(`loadUserBalances2->loadUserBalances2() [from: ${fromDate}, to: ${toDate}]`, err);
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
