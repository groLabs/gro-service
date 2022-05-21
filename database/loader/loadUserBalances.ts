/// Status:
/// - Balances are correctly calculated for unstaked gvt/pwrd/gro, total Gro, pool0, pool1, pool2 & pool3
/// - Balances for pools 4 & 5 rely on tokenCounter referring to LpTokenStakerV1, so values do
///   not have the latest positions of LpTokenStakerV2

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
    getGroDaoToken,
    getLpTokenStakerV1,
    getLpTokenStakerV2,
    getUSDCeVault,
    getUSDCeVault_1_7,
    getUSDTeVault,
    getUSDTeVault_1_7,
    getDAIeVault,
    getDAIeVault_1_7,
    getContractInfoHistory,
    getUni2GvtGro,
    getUni2GroUsdc,
} from '../common/contractUtil';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import {
    checkTime,
    getBalances,
    getBalancesUniBalLP,
    getBalancesCrvLP,
    getUnderlyingFactorsFromPools,
} from '../common/balanceUtil';
import { multiCall } from '../caller/multiCaller';
import gvtABI from '../../abi/ce7b149/NonRebasingGToken.json';
import pwrdABI from '../../abi/ce7b149/RebasingGToken.json';
import groABI from '../../abi/fa8e260/GroDAOToken.json';
import uniGvtGroABI from '../../abi/6270d2c/UniswapV2Pair_gvt_gro.json';
import uniGvtUsdcABI from '../../abi/6270d2c/UniswapV2Pair_gro_usdc.json';
import lpTokenStakerABI from '../../abi/fa8e260/LPTokenStaker.json';
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
let gvtStaked = [];
let pwrd = [];
let gro = [];
let groStaked = [];
let groTotal = [];
let lpGvtGroPooled = [];
let lpGvtGroStaked = [];
let lpGroUsdcPooled = [];
let lpGroUsdcStaked = [];
let lpCrvPwrd = [];
let lpGroWeth = [];
let usdce_1_0 = [];
let usdte_1_0 = [];
let daie_1_0 = [];
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

        // Mainnet only (do the same for ropsten)
        const lpTokenStakerAddress = (block >= 14268775)
            ? getLpTokenStakerV2().address
            : getLpTokenStakerV1().address;

        // TODO: probably replace gvtABI, pwrdABI, etc... by ERC20
        const [
            contractUpdate,
            gvtUpdate,
            gvtStakedUpdate,
            pwrdUpdate,
            groUpdate,
            groStakedUpdate,
            groTotalUpdate,
            lpGvtGroPooledUpdate,
            lpGvtGroStakedUpdate,
            lpGroUsdcPooledUpdate,
            lpGroUsdcStakedUpdate,
            lpCrvPwrdUpdate,
            lpGroWethUpdate,
            usdceUpdate_1_0,
            usdteUpdate_1_0,
            daieUpdate_1_0,
            usdceUpdate_1_7,
            usdteUpdate_1_7,
            daieUpdate_1_7,
        ] = await Promise.all([
            multiCall(GN.ETHEREUM, argentAddress, '', '', argentABI, 'isArgentWallet', userBatch, ReturnType.BOOL, Base.D18, block),
            multiCall(GN.ETHEREUM, getGroVault().address, '', '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, lpTokenStakerAddress, '', '3', lpTokenStakerABI, 'userInfo', userBatch, ReturnType.UINT_UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, getPowerD().address, '', '', pwrdABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, getGroDaoToken().address, '', '', groABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, lpTokenStakerAddress, '', '0', lpTokenStakerABI, 'userInfo', userBatch, ReturnType.UINT_UINT, Base.D18, block),
            (nodeEnv === NetworkName.MAINNET)
                ? getBalances(voteAggregatorAddress, userBatch, block)
                : [],
            multiCall(GN.ETHEREUM, getUni2GvtGro().address, '', '', uniGvtGroABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, lpTokenStakerAddress, '', '1', lpTokenStakerABI, 'userInfo', userBatch, ReturnType.UINT_UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, getUni2GroUsdc().address, '', '', uniGvtUsdcABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18, block),
            multiCall(GN.ETHEREUM, lpTokenStakerAddress, '', '2', lpTokenStakerABI, 'userInfo', userBatch, ReturnType.UINT_UINT, Base.D18, block),
            (nodeEnv === NetworkName.MAINNET)
                ? getBalancesCrvLP(CRV_PWRD_ADDRESS, userBatch, block)
                : [],
            (nodeEnv === NetworkName.MAINNET)
                ? getBalancesUniBalLP(GRO_WETH_ADDRESS, userBatch, block)
                : [],
            // SJS: temporarily disabled (avax balances not used + rpc issues)
            /*
            multiCall(GN.AVALANCHE, getUSDCeVault().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getUSDTeVault().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getDAIeVault().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18),
            multiCall(GN.AVALANCHE, getUSDCeVault_1_7().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getUSDTeVault_1_7().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D6),
            multiCall(GN.AVALANCHE, getDAIeVault_1_7().address, '', gvtABI, 'balanceOf', userBatch, ReturnType.UINT, Base.D18),
            */
            [],
            [],
            [],
            [],
            [],
            []
        ]);

        if (gvt.length === 0) {
            contract = contractUpdate
            gvt = gvtUpdate;
            gvtStaked = gvtStakedUpdate;
            pwrd = pwrdUpdate;
            gro = groUpdate;
            groStaked = groStakedUpdate;
            groTotal = groTotalUpdate;
            lpGvtGroPooled = lpGvtGroPooledUpdate;
            lpGvtGroStaked = lpGvtGroStakedUpdate;
            lpGroUsdcPooled = lpGroUsdcPooledUpdate;
            lpGroUsdcStaked = lpGroUsdcStakedUpdate;
            lpCrvPwrd = lpCrvPwrdUpdate;
            lpGroWeth = lpGroWethUpdate;
            usdce_1_0 = usdceUpdate_1_0;
            usdte_1_0 = usdteUpdate_1_0;
            daie_1_0 = daieUpdate_1_0;
            usdce_1_7 = usdceUpdate_1_7;
            usdte_1_7 = usdteUpdate_1_7;
            daie_1_7 = daieUpdate_1_7;
        } else {
            contract.push(...contractUpdate);
            gvt.push(...gvtUpdate);
            gvtStaked.push(...gvtStakedUpdate);
            pwrd.push(...pwrdUpdate);
            //pwrd[1].amount_staked.push(...pwrdUpdate[1].amount_staked);
            gro.push(...groUpdate);
            groStaked.push(...groStakedUpdate);
            (nodeEnv === NetworkName.MAINNET)
                ? groTotal[0].amount_unstaked.push(...groTotalUpdate[0].amount_unstaked)
                : [];
            lpGvtGroPooled.push(...lpGvtGroPooledUpdate);
            lpGvtGroStaked.push(...lpGvtGroStakedUpdate);
            lpGroUsdcPooled.push(...lpGroUsdcPooledUpdate);
            lpGroUsdcStaked.push(...lpGroUsdcStakedUpdate);
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
            usdce_1_7.push(...usdceUpdate_1_7);
            usdte_1_7.push(...usdteUpdate_1_7);
            daie_1_7.push(...daieUpdate_1_7);
        }

        return (newOffset >= users.length)
            ? {
                contract: contract,
                gvt: gvt,
                gvtStaked: gvtStaked,
                pwrd: pwrd,
                gro: gro,
                groStaked: groStaked,
                groTotal: groTotal,
                lpGvtGroPooled: lpGvtGroPooled,
                lpGvtGroStaked: lpGvtGroStaked,
                lpGroUsdcPooled: lpGroUsdcPooled,
                lpGroUsdcStaked: lpGroUsdcStaked,
                lpCrvPwrd: lpCrvPwrd,
                lpGroWeth: lpGroWeth,
                usdce_1_0: usdce_1_0,
                usdte_1_0: usdte_1_0,
                daie_1_0: daie_1_0,
                usdce_1_7: usdce_1_7,
                usdte_1_7: usdte_1_7,
                daie_1_7: daie_1_7,
            }
            : getBalancesSC(
                users,
                block,
                newOffset,
                account,
                voteAggregatorAddress,
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
    factor: any
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
                res.gvt[i],                             // unstaked gvt
                res.pwrd[i],                            // unstaked pwrd
                res.gro[i],                             // unstaked gro
                (nodeEnv === NetworkName.MAINNET && res.groTotal.length > 0)
                    ? res.groTotal[0].amount_unstaked[i]    // total gro
                    : null,
                res.groStaked[i][0],                    // pool0 - staked lp
                //pool1
                res.lpGvtGroPooled[i],                  // pooled lp
                res.lpGvtGroStaked[i][0],               // staked lp
                (res.lpGvtGroPooled[i] + res.lpGvtGroStaked[i][0]) * factor.pool1GvtFactor,     // staked gvt
                (res.lpGvtGroPooled[i] + res.lpGvtGroStaked[i][0]) * factor.pool1GroFactor,     // staked gro
                //pool2
                res.lpGroUsdcPooled[i],                  // pooled lp
                res.lpGroUsdcStaked[i][0],               // staked lp
                (res.lpGroUsdcPooled[i] + res.lpGroUsdcStaked[i][0]) * factor.pool2GroFactor,   // staked gro
                (res.lpGroUsdcPooled[i] + res.lpGroUsdcStaked[i][0]) * factor.pool2UsdcFactor,  // staked usdc
                res.gvtStaked[i][0],                    // pool3 - staked lp
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
                // SJS: temporarily disables for testing
                // res.usdce_1_0[i],
                // res.usdte_1_0[i],
                // res.daie_1_0[i],
                // res.usdce_1_7[i],
                // res.usdte_1_7[i],
                // res.daie_1_7[i],
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
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
    gvtStaked = [];
    pwrd = [];
    //pwrdStaked = [];
    gro = [];
    groStaked = [];
    groTotal = [];
    lpGvtGroPooled = [];
    lpGvtGroStaked = [];
    lpGroUsdcPooled = [];
    lpGroUsdcStaked = [];
    lpCrvPwrd = [];
    lpGroWeth = [];
    usdce_1_0 = [];
    usdte_1_0 = [];
    daie_1_0 = [];
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

            // Get LP underlying token factors
            const factors = await getUnderlyingFactorsFromPools(block);

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
                const res = await insertBalances(account, i, day, addr, result, factors);
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
