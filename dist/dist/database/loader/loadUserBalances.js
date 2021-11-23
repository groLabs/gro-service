"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadUserBalances = void 0;
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const loadTableUpdates_1 = require("./loadTableUpdates");
const globalUtil_1 = require("../common/globalUtil");
const personalUtil_1 = require("../common/personalUtil");
const contractUtil_1 = require("../common/contractUtil");
const constants_1 = require("../constants");
const balanceUtil_1 = require("../common/balanceUtil");
const constants_2 = require("../constants");
const configUtil_1 = require("../../common/configUtil");
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const GRO_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.gro_address');
const GRO_GVT_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const GRO_USDC_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const CRV_PWRD_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.curve_pwrd3crv_pool_address');
const GRO_WETH_ADDRESS = (0, configUtil_1.getConfig)('staker_pools.contracts.balancer_gro_weth_pool_address');
let rowCount = 0;
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
        const newOffset = (offset + constants_2.BALANCES_BATCH >= users.length)
            ? users.length
            : offset + constants_2.BALANCES_BATCH;
        const userBatch = users.slice(offset, newOffset);
        logger.info(`**DB: Reading balances from TokenCounter() in block ${block} for users ${offset} to ${newOffset}...`);
        const [gvtUpdate, pwrdUpdate, groUpdate, lpGroGvtUpdate, lpGroUsdcUpdate, lpCrvPwrdUpdate, lpGroWethUpdate,] = await Promise.all([
            (0, balanceUtil_1.getBalances)((0, contractUtil_1.getGroVault)().address, userBatch, block),
            (0, balanceUtil_1.getBalances)((0, contractUtil_1.getPowerD)().address, userBatch, block),
            (0, balanceUtil_1.getBalances)(GRO_ADDRESS, userBatch, block),
            (0, balanceUtil_1.getBalancesUniBalLP)(GRO_GVT_ADDRESS, userBatch, block),
            (0, balanceUtil_1.getBalancesUniBalLP)(GRO_USDC_ADDRESS, userBatch, block),
            (0, balanceUtil_1.getBalancesCrvLP)(CRV_PWRD_ADDRESS, userBatch, block),
            (nodeEnv === 'mainnet')
                ? (0, balanceUtil_1.getBalancesUniBalLP)(GRO_WETH_ADDRESS, userBatch, block)
                : [],
        ]);
        if (gvt.length === 0) {
            gvt = gvtUpdate;
            pwrd = pwrdUpdate;
            gro = groUpdate;
            lpGroGvt = lpGroGvtUpdate;
            lpGroUsdc = lpGroUsdcUpdate;
            lpCrvPwrd = lpCrvPwrdUpdate;
            lpGroWeth = lpGroWethUpdate;
        }
        else {
            gvt[0].amount_unstaked.push(...gvtUpdate[0].amount_unstaked);
            gvt[1].amount_staked.push(...gvtUpdate[1].amount_staked);
            pwrd[0].amount_unstaked.push(...pwrdUpdate[0].amount_unstaked);
            pwrd[1].amount_staked.push(...pwrdUpdate[1].amount_staked);
            gro[0].amount_unstaked.push(...groUpdate[0].amount_unstaked);
            gro[1].amount_staked.push(...groUpdate[1].amount_staked);
            lpGroGvt[0].amount_pooled_lp.push(...lpGroGvtUpdate[0].amount_pooled_lp);
            lpGroGvt[1].amount_staked_lp.push(...lpGroGvtUpdate[1].amount_staked_lp);
            lpGroGvt[2].lp_position.push(...lpGroGvtUpdate[2].lp_position);
            lpGroUsdc[0].amount_pooled_lp.push(...lpGroUsdcUpdate[0].amount_pooled_lp);
            lpGroUsdc[1].amount_staked_lp.push(...lpGroUsdcUpdate[1].amount_staked_lp);
            lpGroUsdc[2].lp_position.push(...lpGroUsdcUpdate[2].lp_position);
            lpCrvPwrd[0].amount_pooled_lp.push(...lpCrvPwrdUpdate[0].amount_pooled_lp);
            lpCrvPwrd[1].amount_staked_lp.push(...lpCrvPwrdUpdate[1].amount_staked_lp);
            lpCrvPwrd[2].lp_position.push(...lpCrvPwrdUpdate[2].lp_position);
            (nodeEnv === 'mainnet')
                ? lpGroWeth[0].amount_pooled_lp.push(...lpGroWethUpdate[0].amount_pooled_lp)
                : [];
            (nodeEnv === 'mainnet')
                ? lpGroWeth[1].amount_staked_lp.push(...lpGroWethUpdate[1].amount_staked_lp)
                : [];
            (nodeEnv === 'mainnet')
                ? lpGroWeth[2].lp_position.push(...lpGroWethUpdate[2].lp_position)
                : [];
        }
        return (newOffset >= users.length)
            ? [gvt, pwrd, gro, lpGroGvt, lpGroUsdc, lpCrvPwrd, lpGroWeth]
            : getBalancesSC(users, block, newOffset);
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadUserBalances->getBalancesSC()`, err);
        // return [] ?
    }
};
const insertBalances = async (account, i, day, addr, isSnapshot) => {
    return new Promise(async (resolve) => {
        try {
            const params = [
                day,
                (0, personalUtil_1.getNetworkId)(),
                addr,
                gvt[0].amount_unstaked[i],
                pwrd[0].amount_unstaked[i],
                gro[0].amount_unstaked[i],
                gro[1].amount_staked[i],
                lpGroGvt[0].amount_pooled_lp[i],
                lpGroGvt[1].amount_staked_lp[i],
                lpGroGvt[2].lp_position[i][0],
                lpGroGvt[2].lp_position[i][1],
                lpGroUsdc[0].amount_pooled_lp[i],
                lpGroUsdc[1].amount_staked_lp[i],
                lpGroUsdc[2].lp_position[i][0],
                lpGroUsdc[2].lp_position[i][1],
                gvt[1].amount_staked[i],
                lpCrvPwrd[0].amount_pooled_lp[i],
                lpCrvPwrd[1].amount_staked_lp[i],
                lpCrvPwrd[2].lp_position[i],
                lpGroWeth[0].amount_pooled_lp[i],
                lpGroWeth[1].amount_staked_lp[i],
                lpGroWeth[2].lp_position[i][0],
                lpGroWeth[2].lp_position[i][1],
                moment_1.default.utc(),
            ];
            const q = (account)
                ? 'insert_user_cache_fact_balances.sql'
                : (isSnapshot)
                    ? 'insert_user_std_fact_balances_snapshot.sql'
                    : 'insert_user_std_fact_balances.sql';
            const result = await (0, queryHandler_1.query)(q, params);
            if (result.status === constants_1.QUERY_ERROR)
                resolve(false);
            rowCount += result.rowCount;
            resolve(true);
        }
        catch (err) {
            (0, personalUtil_1.handleErr)(`loadUserBalances->insertBalances()`, err);
            resolve(false);
        }
    });
};
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
    rowCount = 0;
};
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
        };
    }
    else {
        // TODO: select distinct transfers where day <= target date (for future data reloads)
        res = await (0, queryHandler_1.query)('select_distinct_users_transfers.sql', []);
        if (res.status === constants_1.QUERY_ERROR)
            return [];
    }
    // Extract value from array of object [user_address: 0x...]
    return res.rows.map(key => key.user_address);
};
/// @notice Check if target date >= deployment date of TokenCounter SC
/// @param  day The target day [format: DD/MM/YYYY]
/// @return True if target >= TokenCounter deployment date; False otherwise
const checkTokenCounterDate = (day) => {
    // TODO: replace by config/registry data (this is mainnet deployment)
    const tokenCounterStartDate = moment_1.default.utc('26/10/2021', 'DD/MM/YYYY')
        .add(10, 'hours')
        .add(55, 'minutes')
        .add(42, 'seconds');
    if (!day.isSameOrAfter(tokenCounterStartDate)) {
        const msg = `target date [${day}] before TokenCounter date [${tokenCounterStartDate}]`;
        logger.error(`loadUserBalances->checkTokenCounterDate(): ${msg}`);
        return false;
    }
    else {
        return true;
    }
};
/// @notice Show message logs after successful loads
const showMsg = (account, date, table) => {
    let msg3 = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${(0, personalUtil_1.isPlural)(rowCount)} `;
    msg3 += `added into ${table} `;
    msg3 += `for date ${(0, moment_1.default)(date).format('DD/MM/YYYY')}`;
    logger.info(msg3);
};
/// @notice Load user balances into USER_STD_FACT_BALANCES* tables
/// @dev    - Data is sourced from SC calls to users' balances at a certain block number
///         according to the dates provided
///         - TokenCounter SC only available in mainnet from 26/10/2021
/// @param  fromDate Start date to load balances (date format: 'DD/MM/YYYY')
/// @param  toDdate End date to load balances (date format: 'DD/MM/YYYY')
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserBalances = async (fromDate, toDate, account, time, isSnapshot) => {
    try {
        // Retrieve target time to load balances (23:59:59 by default)
        const [hours, minutes, seconds] = (0, balanceUtil_1.checkTime)(time);
        if (hours === -1)
            return false;
        // Retrieve users to load balances for
        const users = await retrieveUsers(account);
        // Generate range of dates to be processed (in case fromDate <> toDate)
        const dates = (0, personalUtil_1.generateDateRange)(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${users.length} user balance${(0, personalUtil_1.isPlural)(users.length)}...`);
        for (const date of dates) {
            const day = moment_1.default.utc(date, "DD/MM/YYYY")
                .add(hours, 'hours')
                .add(minutes, 'minutes')
                .add(seconds, 'seconds');
            // Check if target day >= deployment date of TokenCounter SC
            const isTokenCounterValidDate = checkTokenCounterDate(day);
            if (!isTokenCounterValidDate)
                return false;
            // @ts-ignore
            const block = (await (0, globalUtil_1.findBlockByDate)(day, false)).block;
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
                const res = await insertBalances(account, i, day, addr, isSnapshot);
                if (!res)
                    return false;
            }
            const table = (account)
                ? 'USER_CACHE_FACT_BALANCES'
                : (isSnapshot)
                    ? 'USER_STD_FACT_BALANCES_SNAPSHOT'
                    : 'USER_STD_FACT_BALANCES';
            showMsg(account, date, table);
            cleanseVars('rows');
        }
        cleanseVars('all');
        // Update table SYS_USER_LOADS with the last loads
        if (account || isSnapshot) {
            return true;
        }
        else {
            const res = await (0, loadTableUpdates_1.loadTableUpdates)('USER_STD_FACT_BALANCES', fromDate, toDate);
            return (res) ? true : false;
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadUserBalances->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
};
exports.loadUserBalances = loadUserBalances;
