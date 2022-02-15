import moment from 'moment';
import { query } from '../handler/queryHandler';
import {
    isPlural,
    getNetwork,
    findBlockByDate,
} from '../common/globalUtil';
import { generateDateRange, } from '../common/personalUtil';
import {
    getGroVault,
    getPowerD,
    getUSDCeVault,
    getUSDCeVault_1_5,
    getUSDCeVault_1_6,
    getUSDCeVault_1_7,
    getUSDTeVault,
    getUSDTeVault_1_5,
    getUSDTeVault_1_6,
    getUSDTeVault_1_7,
    getDAIeVault,
    getDAIeVault_1_5,
    getDAIeVault_1_6,
    getDAIeVault_1_7,
    getContractInfoHistory,
} from '../common/contractUtil';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import {
    checkTime,
    getBalances,
    getBalancesUniBalLP,
    getBalancesCrvLP
} from '../common/balanceUtil';
import { multiCall } from '../caller/multiCaller';
import gvtABI from '../../abi/ce7b149/NonRebasingGToken.json';
import argentABI from '../../abi/Argent.json';
import { BALANCES_BATCH as BATCH } from '../constants';
import { getConfig } from '../../common/configUtil';
import {
    ReturnType,
    NetworkName,
    GlobalNetwork as GN,
    Base,
} from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';

const nodeEnv = process.env.NODE_ENV.toLowerCase();
const argentAddress = getConfig('argentWalletDetector.address');

// Contract addresses
const GRO_ADDRESS = getConfig('staker_pools.contracts.gro_address');
const GRO_GVT_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
const GRO_USDC_ADDRESS = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
const CRV_PWRD_ADDRESS = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address');
const GRO_WETH_ADDRESS = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');


let rowCount = 0;
let contract = [];
let gvt = [];
let pwrd = [];
let gro = [];
let groTotal = [];
let lpGroGvt = [];
let lpGroUsdc = [];
let lpCrvPwrd = [];
let lpGroWeth = [];
let usdce_1_0 = [];
let usdte_1_0 = [];
let daie_1_0 = [];
let usdce_1_5 = [];
let usdte_1_5 = [];
let daie_1_5 = [];
let usdce_1_6 = [];
let usdte_1_6 = [];
let daie_1_6 = [];
let usdce_1_7 = [];
let usdte_1_7 = [];
let daie_1_7 = [];

/// @notice Retrieve user balances in a recursive way by batches
/// @dev    - The amount of users per batch is defined in constant <BATCH>
///         - The offset & batch will define the amount of users to be processed on
///           every function iteration
/// @param  users The array of users to be processed
/// @param  block The block number to retrieve user balances at
/// @param  offset The offset to track the start and end position in the users array
///         to be processed on each iteration
/// @account Only used to skip showing logs for cache load
/// @return An array with 7 fixed subarrays, each of them containing all balances per token
///         (gvt, pwrd, gro, gro/gvt, gro/usdc, 3crv, gro/weth)
const getBalancesSC = async (
    users: string[],
    block: number,
    offset: number,
    account: string,
    voteAggregatorAddress: string,
) => {
    try {
        const newOffset = (offset + BATCH >= users.length)
            ? users.length
            : offset + BATCH;

        const userBatch = users.slice(offset, newOffset);

        if (!account) {
            const desc = `block ${block} for users ${offset} to ${newOffset}...`;
            showInfo(`Reading balances from TokenCounter() in ${desc}`);
        }

        const [
            contractUpdate,
            gvtUpdate,
            pwrdUpdate,
            groUpdate,
            groTotalUpdate,
            lpGroGvtUpdate,
            lpGroUsdcUpdate,
            lpCrvPwrdUpdate,
            lpGroWethUpdate,
            usdceUpdate_1_0,
            usdteUpdate_1_0,
            daieUpdate_1_0,
            usdceUpdate_1_5,
            usdteUpdate_1_5,
            daieUpdate_1_5,
            usdceUpdate_1_6,
            usdteUpdate_1_6,
            daieUpdate_1_6,
            usdceUpdate_1_7,
            usdteUpdate_1_7,
            daieUpdate_1_7,
        ] = await Promise.all([
            multiCall(GN.ETHEREUM, argentAddress, '', argentABI, 'isArgentWallet', userBatch, ReturnType.BOOL, Base.D18),
            getBalances(getGroVault().address, userBatch, block),
            getBalances(getPowerD().address, userBatch, block),
            getBalances(GRO_ADDRESS, userBatch, block),
            (nodeEnv === NetworkName.MAINNET)
                ? getBalances(voteAggregatorAddress, userBatch, block)
                : [],
            getBalancesUniBalLP(GRO_GVT_ADDRESS, userBatch, block),
            getBalancesUniBalLP(GRO_USDC_ADDRESS, userBatch, block),
            (nodeEnv === NetworkName.MAINNET)
                ? getBalancesCrvLP(CRV_PWRD_ADDRESS, userBatch, block)
                : [],
            (nodeEnv === NetworkName.MAINNET)
                ? getBalancesUniBalLP(GRO_WETH_ADDRESS, userBatch, block)
                : [],
            multiCall(GN.AVALANCHE, getUSDCeVault().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getUSDTeVault().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getDAIeVault().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18),
            multiCall(GN.AVALANCHE, getUSDCeVault_1_5().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getUSDTeVault_1_5().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getDAIeVault_1_5().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18),
            multiCall(GN.AVALANCHE, getUSDCeVault_1_6().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getUSDTeVault_1_6().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getDAIeVault_1_6().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18),
            multiCall(GN.AVALANCHE, getUSDCeVault_1_7().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getUSDTeVault_1_7().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getDAIeVault_1_7().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18),
        ]);

        if (gvt.length === 0) {
            contract = contractUpdate
            gvt = gvtUpdate;
            pwrd = pwrdUpdate;
            gro = groUpdate;
            groTotal = groTotalUpdate;
            lpGroGvt = lpGroGvtUpdate;
            lpGroUsdc = lpGroUsdcUpdate;
            lpCrvPwrd = lpCrvPwrdUpdate;
            lpGroWeth = lpGroWethUpdate;
            usdce_1_0 = usdceUpdate_1_0;
            usdte_1_0 = usdteUpdate_1_0;
            daie_1_0 = daieUpdate_1_0;
            usdce_1_5 = usdceUpdate_1_5;
            usdte_1_5 = usdteUpdate_1_5;
            daie_1_5 = daieUpdate_1_5;
            usdce_1_6 = usdceUpdate_1_6;
            usdte_1_6 = usdteUpdate_1_6;
            daie_1_6 = daieUpdate_1_6;
            usdce_1_7 = usdceUpdate_1_7;
            usdte_1_7 = usdteUpdate_1_7;
            daie_1_7 = daieUpdate_1_7;
        } else {
            contract.push(...contractUpdate);
            gvt[0].amount_unstaked.push(...gvtUpdate[0].amount_unstaked);
            gvt[1].amount_staked.push(...gvtUpdate[1].amount_staked);
            pwrd[0].amount_unstaked.push(...pwrdUpdate[0].amount_unstaked);
            pwrd[1].amount_staked.push(...pwrdUpdate[1].amount_staked);
            gro[0].amount_unstaked.push(...groUpdate[0].amount_unstaked);
            gro[1].amount_staked.push(...groUpdate[1].amount_staked);
            (nodeEnv === NetworkName.MAINNET)
                ? groTotal[0].amount_unstaked.push(...groTotalUpdate[0].amount_unstaked)
                : [];
            lpGroGvt[0].amount_pooled_lp.push(...lpGroGvtUpdate[0].amount_pooled_lp);
            lpGroGvt[1].amount_staked_lp.push(...lpGroGvtUpdate[1].amount_staked_lp);
            lpGroGvt[2].lp_position.push(...lpGroGvtUpdate[2].lp_position);
            lpGroUsdc[0].amount_pooled_lp.push(...lpGroUsdcUpdate[0].amount_pooled_lp);
            lpGroUsdc[1].amount_staked_lp.push(...lpGroUsdcUpdate[1].amount_staked_lp);
            lpGroUsdc[2].lp_position.push(...lpGroUsdcUpdate[2].lp_position);
            (nodeEnv === NetworkName.MAINNET)
                ? lpCrvPwrd[0].amount_pooled_lp.push(...lpCrvPwrdUpdate[0].amount_pooled_lp)
                : [];
            (nodeEnv === NetworkName.MAINNET)
                ? lpCrvPwrd[1].amount_staked_lp.push(...lpCrvPwrdUpdate[1].amount_staked_lp)
                : [];
            (nodeEnv === NetworkName.MAINNET)
                ? lpCrvPwrd[2].lp_position.push(...lpCrvPwrdUpdate[2].lp_position)
                : [];
            (nodeEnv === NetworkName.MAINNET)
                ? lpGroWeth[0].amount_pooled_lp.push(...lpGroWethUpdate[0].amount_pooled_lp)
                : [];
            (nodeEnv === NetworkName.MAINNET)
                ? lpGroWeth[1].amount_staked_lp.push(...lpGroWethUpdate[1].amount_staked_lp)
                : [];
            (nodeEnv === NetworkName.MAINNET)
                ? lpGroWeth[2].lp_position.push(...lpGroWethUpdate[2].lp_position)
                : [];
            usdce_1_0.push(...usdceUpdate_1_0);
            usdte_1_0.push(...usdteUpdate_1_0);
            daie_1_0.push(...daieUpdate_1_0);
            usdce_1_5.push(...usdceUpdate_1_5);
            usdte_1_5.push(...usdteUpdate_1_5);
            daie_1_5.push(...daieUpdate_1_5);
            usdce_1_6.push(...usdceUpdate_1_6);
            usdte_1_6.push(...usdteUpdate_1_6);
            daie_1_6.push(...daieUpdate_1_6);
            usdce_1_7.push(...usdceUpdate_1_7);
            usdte_1_7.push(...usdteUpdate_1_7);
            daie_1_7.push(...daieUpdate_1_7);
        }

        return (newOffset >= users.length)
            ? {
                contract: contract,
                gvt: gvt,
                pwrd: pwrd,
                gro: gro,
                groTotal: groTotal,
                lpGroGvt: lpGroGvt,
                lpGroUsdc: lpGroUsdc,
                lpCrvPwrd: lpCrvPwrd,
                lpGroWeth: lpGroWeth,
                usdce_1_0: usdce_1_0,
                usdte_1_0: usdte_1_0,
                daie_1_0: daie_1_0,
                usdce_1_5: usdce_1_5,
                usdte_1_5: usdte_1_5,
                daie_1_5: daie_1_5,
                usdce_1_6: usdce_1_6,
                usdte_1_6: usdte_1_6,
                daie_1_6: daie_1_6,
                usdce_1_7: usdce_1_7,
                usdte_1_7: usdte_1_7,
                daie_1_7: daie_1_7,
            }
            : getBalancesSC(
                users,
                block,
                newOffset,
                account,
                voteAggregatorAddress
            );

    } catch (err) {
        showError('loadUserBalances.ts->getBalancesSC()', err);
        return null;
    }
}

const insertBalances = async (
    account: string,
    i: number,
    day: moment.Moment,
    addr: string,
    res: any,
): Promise<boolean> => {
    return new Promise(async (resolve) => {
        try {
            const params = [
                day,
                getNetwork(GN.ETHEREUM).id,
                addr,
                contract[i]
                    ? 1                                 // Argent wallet
                    : 0,                                // non Argent wallet
                res.gvt[0].amount_unstaked[i],          // unstaked gvt
                res.pwrd[0].amount_unstaked[i],         // unstaked pwrd
                res.gro[0].amount_unstaked[i],          // unstaked gro
                (nodeEnv === NetworkName.MAINNET && res.groTotal.length > 0)
                    ? res.groTotal[0].amount_unstaked[i]    // total gro
                    : null,
                res.gro[1].amount_staked[i],            // pool0 - staked lp
                res.lpGroGvt[0].amount_pooled_lp[i],    // pool1 - pooled lp
                res.lpGroGvt[1].amount_staked_lp[i],    // pool1 - staked lp
                res.lpGroGvt[2].lp_position[i][0],      // pool1 - staked gvt
                res.lpGroGvt[2].lp_position[i][1],      // pool1 - staked gro
                res.lpGroUsdc[0].amount_pooled_lp[i],   // pool2 - pooled lp
                res.lpGroUsdc[1].amount_staked_lp[i],   // pool2 - staked lp
                res.lpGroUsdc[2].lp_position[i][0],     // pool2 - staked gro
                res.lpGroUsdc[2].lp_position[i][1],     // pool2 - staked usdc
                res.gvt[1].amount_staked[i],            // pool3 - staked lp
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpCrvPwrd[0].amount_pooled_lp[i]   // pool4 - pooled lp
                    : null,
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpCrvPwrd[1].amount_staked_lp[i]   // pool4 - staked lp
                    : null,
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpCrvPwrd[2].lp_position[i]        // pool4 - staked pwrd
                    : null,
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpGroWeth[0].amount_pooled_lp[i]   // pool5 - pooled lp
                    : null,
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpGroWeth[1].amount_staked_lp[i]   // pool5 - staked lp
                    : null,
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpGroWeth[2].lp_position[i][0]     // pool5 - staked gro
                    : null,
                (nodeEnv === NetworkName.MAINNET)
                    ? res.lpGroWeth[2].lp_position[i][1]     // pool5 - staked weth
                    : null,
                res.usdce_1_0[i],
                res.usdte_1_0[i],
                res.daie_1_0[i],
                res.usdce_1_5[i],
                res.usdte_1_5[i],
                res.daie_1_5[i],
                res.usdce_1_6[i],
                res.usdte_1_6[i],
                res.daie_1_6[i],
                res.usdce_1_7[i],
                res.usdte_1_7[i],
                res.daie_1_7[i],
                moment.utc(),
            ];

            const q = (account)
                ? 'insert_user_balances_cache.sql'
                : 'insert_user_balances_snapshot.sql'
            const result = await query(q, params);

            if (result.status === QUERY_ERROR)
                resolve(false);

            rowCount += result.rowCount;

            resolve(true);

        } catch (err) {
            showError('loadUserBalances.ts->insertBalances()', err);
            resolve(false);
        }
    });
}

/// @notice Retrieve all distinct users that did any transfer (deposit, withdrawal, transer)
///         from the beginning of the protocol
/// @param  account The user address for cache query
/// @return An array with all users to be processed
const retrieveUsers = async (account: string) => {
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
    return res.rows.map(key => key.user_address);
}

/// @notice Check if target date >= deployment date of TokenCounter SC
/// @param  day The target day [format: DD/MM/YYYY]
/// @return True if target >= TokenCounter deployment date; False otherwise
const checkTokenCounterDate = (day: moment.Moment) => {
    // TODO: replace by config/registry data (this is mainnet deployment)
    const tokenCounterStartDate = moment.utc('26/10/2021', 'DD/MM/YYYY')
        .add(10, 'hours')
        .add(55, 'minutes')
        .add(42, 'seconds');

    if (!day.isSameOrAfter(tokenCounterStartDate)) {
        showError(
            'loadUserBalances.ts->checkTokenCounterDate()',
            `target date [${day}] before TokenCounter date [${tokenCounterStartDate}]`
        );
        return false;
    } else {
        return true;
    }
}

/// @notice Initialise global vars to 0 or empty
const cleanseVars = () => {
    contract = [];
    gvt = [];
    pwrd = [];
    gro = [];
    groTotal = [];
    lpGroGvt = [];
    lpGroUsdc = [];
    lpCrvPwrd = [];
    lpGroWeth = [];
    usdce_1_0 = [];
    usdte_1_0 = [];
    daie_1_0 = [];
    usdce_1_5 = [];
    usdte_1_5 = [];
    daie_1_5 = [];
    usdce_1_6 = [];
    usdte_1_6 = [];
    daie_1_6 = [];
    usdce_1_7 = [];
    usdte_1_7 = [];
    daie_1_7 = [];
    rowCount = 0;
}

/// @notice Load user balances into USER_STD_FACT_BALANCES* tables
/// @dev    - Data is sourced from SC calls to users' balances at a certain block number
///         according to the dates provided
///         - TokenCounter SC only available in mainnet from 26/10/2021
/// @param  fromDate Start date to load balances (date format: 'DD/MM/YYYY')
/// @param  toDdate End date to load balances (date format: 'DD/MM/YYYY')
/// @param  account User address for cache loading; null for daily loads
/// @param  time Specific time to load balances (time format: 'HH:MM:SS')
/// @param  isSnapshot:
///             - if 'true', load balances into table USER_STD_FACT_BALANCES_SNAPSHOT
///             - if 'false', load balances into table USER_STD_FACT_BALANCES
/// @return True if no exceptions found, false otherwise
const loadUserBalances = async (
    fromDate: string,
    toDate: string,
    account: string,
    time: string,
): Promise<boolean> => {
    try {
        // Retrieve target time to load balances (23:59:59 by default)
        const [hours, minutes, seconds] = checkTime(time);
        if (hours === -1)
            return false;

        // Retrieve users to load balances for
        const users = await retrieveUsers(account);

        // Generate range of dates to be processed (in case fromDate <> toDate)
        const dates = generateDateRange(fromDate, toDate);

        // Truncate table
        if (!account) {
            const result = await query('truncate_user_balances_snapshot.sql', []);
            if (result.status === QUERY_ERROR) {
                return false;
            } else {
                showInfo(`Table USER_BALANCES_SNAPSHOT truncated`);
            }
        }

        if (!account)
            showInfo(`Processing ${users.length} user balance${isPlural(users.length)}...`);

        for (const date of dates) {

            const day = moment.utc(date, "DD/MM/YYYY")
                .add(hours, 'hours')
                .add(minutes, 'minutes')
                .add(seconds, 'seconds');

            // Check if target day >= deployment date of TokenCounter SC
            const isTokenCounterValidDate = checkTokenCounterDate(day);
            if (!isTokenCounterValidDate)
                return false;
            // @ts-ignore
            const block = (await findBlockByDate(day, false)).block;

            // Vote Aggregator contract only available in mainnet
            let voteAggregatorAddress = '';
            if (nodeEnv === NetworkName.MAINNET) {
                const voteAggregator = (await getContractInfoHistory('VotingAggregator', block));
                if (voteAggregator.status === QUERY_SUCCESS) {
                    voteAggregatorAddress = voteAggregator.data.address;
                } else {
                    showError(
                        'loadUserBalances.ts->loadUserBalances()',
                        `tokenAggregator contract not found for block ${block}`
                    );
                    return false;
                }
            }

            // Retrieve balances from the SC
            const result = await getBalancesSC(
                users,
                block,
                0,
                account,
                voteAggregatorAddress,
            );
            if (!result)
                showError(
                    'loadUserBalances.ts->loadUserBalances()',
                    'Error when retrieving balances in batch mode'
                );

            // Insert balances into the DB
            for (let i = 0; i < users.length; i++) {
                const addr = users[i];
                const res = await insertBalances(account, i, day, addr, result);
                if (!res)
                    return false;
            }

            // Show amount of inserted records
            if (!account) {
                let msg3 = `${rowCount} record${isPlural(rowCount)} `;
                msg3 += `added into USER_BALANCES_SNAPSHOT `;
                msg3 += `for date ${moment(date).format('DD/MM/YYYY')}`;
                showInfo(msg3);
                rowCount = 0;
            }
        }

        cleanseVars();

        return true;

    } catch (err) {
        showError(
            'loadUserBalances->loadUserBalances()',
            `[from: ${fromDate}, to: ${toDate}]: ${err}`);
        return false;
    }
}

export {
    loadUserBalances,
};
