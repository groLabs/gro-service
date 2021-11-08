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

let rowCountStaked = 0;
let rowExcludedStaked = 0;
let rowCountUnstaked = 0;
let rowExcludedUnstaked = 0;
let rowCountPooled = 0;
let rowExcludedPooled = 0;

let gvt = [];
let pwrd = [];
let gro = [];
let lpGroGvt = [];
let lpGroUsdc = [];
let lpCrvPwrd = [];
let lpGroWeth = [];


/// @notice Retrieve user balances in a recursive way by batches
/// @dev    - The amount of users per batch is defined in constant <BATCH>
///         - The offset & batch will define the amount of users to be processed on
///           every function iteration
/// @param  users The array of users to be processed
/// @param  block The block number to retrieve user balances at
/// @param  offset The offset to track the start and end position in the users array
///         to be processed on each iteration
/// @return An array with 7 fixed subarrays, each of them containing all balances per token
///         (gvt, pwrd, gro, gro/gvt, gro/usdc, 3crv, gro/weth)  
const getBalancesSC = async (users, block, offset) => {
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
            : getBalancesSC(users, block, newOffset);

    } catch (err) {
        handleErr(`loadUserBalances2->getBalancesSC()`, err);
        // return [] ?
    }
}

const loadStakedBalance = (account, i, day, addr) => {
    return new Promise(async (resolve) => {

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

        if (isStakedBalance) {
            // TODO: add cache query
            const q = 'insert_user_std_fact_balances_staked.sql';
            const result = await query(q, stakedParams);
            if (result.status === QUERY_ERROR)
                resolve(false);
            rowCountStaked += result.rowCount;
        } else {
            rowExcludedStaked++;
        }

        resolve(true);
    });
}

const loadUnstakedBalance = (account, i, day, addr) => {
    return new Promise(async (resolve) => {

        const isUnstakedBalance = (
            gvt[0].amount_unstaked[i]
            + pwrd[0].amount_unstaked[i]
            + gro[0].amount_unstaked[i]
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

        if (isUnstakedBalance) {
            const q = (account)
                // ? 'insert_user_cache_fact_balances.sql'  // **** TODO ****
                ? 'insert_user_std_fact_balances_unstaked.sql'  // **** for TESTING ONLY *****
                : 'insert_user_std_fact_balances_unstaked.sql';
            const result = await query(q, unstakedParams);
            if (result.status === QUERY_ERROR)
                resolve(false);
            rowCountUnstaked += result.rowCount;
        } else {
            rowExcludedUnstaked++;
        }

        resolve(true);
    });
}

const loadPooledBalance = (account, i, day, addr) => {
    return new Promise(async (resolve) => {

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

        if (isPooledBalance) {
            // TODO: add cache query
            const q = 'insert_user_std_fact_balances_pooled.sql';
            const result = await query(q, pooledParams);
            if (result.status === QUERY_ERROR)
                resolve(false);
            rowCountPooled += result.rowCount;
        } else {
            rowExcludedPooled++;
        }

        resolve(true);
    });
}

/// @notice Initialise global vars to 0 or empty
const cleanseVars = (scope) => {
    if (scope === 'all') {
        gvt = [];
        pwrd = [];
        gro = [];
        lpGroGvt = [];
        lpGroUsdc = [];
        lpCrvPwrd = [];
        lpGroWeth = [];
    }
    rowCountStaked = 0;
    rowExcludedStaked = 0;
    rowCountUnstaked = 0;
    rowExcludedUnstaked = 0;
    rowCountPooled = 0;
    rowExcludedPooled = 0;
}

/// @notice Check time format (if defined) and return hours, minutes & seconds
/// @dev    If time is not defined, return 23:59:59 by default
/// @param  time The target time to load balances [format: HH:mm:ss]
/// @return An array with 7 fixed positions: hours, minuts & seconds
const checkTime = (time) => {
    const isTimeOK = moment(time, 'HH:mm:ss', true).isValid();
    if (!time) {
        return [23, 59, 59];
    } else if (isTimeOK) {
        const hours = parseInt(time.substring(0, 2));
        const minutes = parseInt(time.substring(3, 5));
        const seconds = parseInt(time.substring(6, 8));
        return [hours, minutes, seconds];
    } else {
        handleErr(`loadUserBalances2->checkTime(): invalid time format`, time);
        return [-1, -1, -1];
    }
}

/// @notice Retrieve all distinct users that did any transfer (deposit, withdrawal, transer)
///         from the beginning of the protocol
/// @param  account The user address for cache query
/// @return An array with all users to be processed
const retrieveUsers = async (account) => {
    let res;
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
            return [];
    }
    // Extract value from array of object [user_address: 0x...]
    const users = res.rows.map(key => key.user_address);
    return users;
}

/// @notice Check if target date >= deployment date of TokenCounter SC
/// @param  day The target day [format: DD/MM/YYYY]
/// @return True if target >= TokenCounter deployment date; False otherwise
const checkTokenCounterDate = (day) => {
    // TODO: replace by config/registry data (this is mainnet deployment)
    const tokenCounterStartDate = moment.utc('26/10/2021', 'DD/MM/YYYY')
        .add(10, 'hours')
        .add(55, 'minutes')
        .add(42, 'seconds');

    if (!day.isSameOrAfter(tokenCounterStartDate)) {
        const msg = `target date [${day}] before TokenCounter date [${tokenCounterStartDate}]`;
        logger.error(`loadUserBalances2->loadUserBalances2(): ${msg}`);
        return false;
    } else {
        return true;
    }
}

/// @notice Show message logs after successful loads
const showMsg = (account, date, rowCount, rowExcluded, table) => {
    let msg3 = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${isPlural(rowCount)} `;
    msg3 += `added into ${table} `;
    msg3 += (rowExcluded !== 0) ? `(excluded ${rowExcluded} with 0-balance) ` : '';
    msg3 += `for date ${moment(date).format('DD/MM/YYYY')}`;
    logger.info(msg3);
}

/// @notice Update table SYS_USER_LOADS with the last loads
const updateSysTable = async (account, fromDate, toDate) => {
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
}


/// @notice Load user balances into USER_STD_FACT_BALANCES* tables
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
        // Retrieve target time to load balances (23:59:59 by default)
        const [hours, minutes, seconds] = checkTime(time);
        if (hours === -1)
            return false;

        // Retrieve users to load balances for
        const users = await retrieveUsers(account);

        // Generate range of dates to be processed (in case fromDate <> toDate)
        const dates = generateDateRange(fromDate, toDate);

        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${users.length} user balance${isPlural(users.length)}...`);

        for (const date of dates) {

            const day = moment.utc(date, "DD/MM/YYYY")
                .add(hours, 'hours')
                .add(minutes, 'minutes')
                .add(seconds, 'seconds');

            // Check if target day >= deployment date of TokenCounter SC
            const isTokenCounterValidDate = checkTokenCounterDate(day);
            if (!isTokenCounterValidDate)
                return false;

            const block = (await findBlockByDate(day, false)).block;

            [
                gvt,
                pwrd,
                gro,
                lpGroGvt,
                lpGroUsdc,
                lpCrvPwrd,
                lpGroWeth
            ] = await getBalancesSC(users, block, 0);

            for (let i = 0; i < users.length; i++) {

                const addr = users[i];

                const [
                    resUnstaked,
                    resStaked,
                    resPooled,
                ] = await Promise.all([
                    loadUnstakedBalance(account, i, day, addr),
                    loadStakedBalance(account, i, day, addr),
                    loadPooledBalance(account, i, day, addr)
                ]);

                if (!resUnstaked || !resStaked || !resPooled)
                    return false;

            }

            showMsg(account, date, rowCountUnstaked, rowExcludedUnstaked, 'USER_STD_FACT_BALANCES_UNSTAKED');
            showMsg(account, date, rowCountStaked, rowExcludedStaked, 'USER_STD_FACT_BALANCES_STAKED');
            showMsg(account, date, rowCountPooled, rowExcludedPooled, 'USER_STD_FACT_BALANCES_POOLED');
            cleanseVars('rows');
        }

        cleanseVars('all');

        // Update table SYS_USER_LOADS with the last loads
        return await updateSysTable(account, fromDate, toDate);

    } catch (err) {
        handleErr(`loadUserBalances2->loadUserBalances2() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

module.exports = {
    loadUserBalances2,
};
