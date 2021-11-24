import { ethers, BigNumber } from 'ethers';
import { BigNumber as BN } from 'bignumber.js';
import { ContractNames } from '../../registry/registry';
import  { newSystemLatestContracts } from '../../registry/contracts'
import { getAlchemyRpcProvider } from '../../common/chainUtil';
import { getConfig } from '../../common/configUtil';
import { findBlockByDate } from '../common/globalUtil';
import { floatToBN } from '../../common/digitalUtil';
const providerKey = 'stats_gro';
import moment from 'moment';
// const { airdrop4Addr: AIRDROP4_ADDRESSES } = require('../files/airdrop4Addr');
// const { airdrop4AddrGvtStaking: AIRDROP4_ADDRESSES } = require('../files/airdrop4AddrGvtStaking');
const { airdrop4StakingFinal: AIRDROP4_ADDRESSES } = require('../files/airdrop4stakingFinal');
import { loadAirdrop4, loadTempAirdrop4, truncateTempAirdrop4 } from '../loader/loadAirdrop4';
import { getNetworkId } from '../common/personalUtil';

// ABIs
import UniswapRouteABI from '../../stats/abi/uniswapRoute.json';
import UniswapABI from '../../stats/abi/uniswap.json';
const GroABI = require('../../stats/abi/GRO.json');
import LpTokenStakerABI from '../../stats/abi/LPTokenStaker.json';
import LpTokenABI from '../../stats/abi/LpToken.json';
import CurvePoolABI from '../../stats/abi/SwapPool.json';
import GroWethABI from '../../abi/fa8e260/BalancerWeightedPool.json';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

// Contracts
let lpTokenStaker;
let groVault;
let groPwrd;
let groToken;
let uniswapRoute;
let uniswapGroGvtPool;
let groPwrdUsdcLpToken;
let uniswapGroUsdcPool;
let curvePwrd3crvPool;
let curve3Pool;
let curve3CrvLpToken;
let groWethLpToken;


const END_SNAPSHOT_TIMESTAMP = 1633651191; // Oct-07-2021 11:59:51 PM +UTC
const END_SNAPSHOT_DATE = moment.unix(END_SNAPSHOT_TIMESTAMP).utc();
const END_SNAPSHOT_BLOCK = 13374853;

const latestSystemContracts = {};

function getLatestSystemContract(contractName, providerKey) {
    providerKey = providerKey || 'stats_gro';
    if (!latestSystemContracts[providerKey]) {
        latestSystemContracts[providerKey] =
            newSystemLatestContracts(providerKey);
    }
    return latestSystemContracts[providerKey][contractName];
}

function printUsd(value) {
    return new BN(value.toString())
        .div(new BN(10).pow(new BN(18)))
        .toFixed(7)
        .toString();
}

const initContracts = async () => {
    logger.info('init contracts');
    const provider = getAlchemyRpcProvider(providerKey);

    const groAddress = getConfig('staker_pools.contracts.gro_address') as string;
    const stakerAddress = getConfig('staker_pools.contracts.staker_address') as string;
    const oracleAddress = getConfig('staker_pools.contracts.gro_price_oracle_address') as string;
    const uniPoolGroGvtAddress = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address') as string;
    const pwrdUsdcLpAddress = getConfig('staker_pools.contracts.pwrd_usdc_lp_address') as string;
    const uniPoolGroUsdcAddress = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address') as string;
    const curvePwrd3crvPoolAddress = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address') as string;
    const curve3poolAddress = getConfig('staker_pools.contracts.curve_3pool_address') as string;
    const curve3crvAddress = getConfig('staker_pools.contracts.curve_3crv_address') as string;
    const groWethAddress = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address') as string;

    lpTokenStaker = new ethers.Contract(stakerAddress, LpTokenStakerABI, provider);
    groVault = await getLatestSystemContract(ContractNames.groVault, providerKey).contract;
    groPwrd = await getLatestSystemContract(ContractNames.powerD, providerKey).contract;
    groToken = new ethers.Contract(groAddress, GroABI, provider);
    uniswapRoute = new ethers.Contract(oracleAddress, UniswapRouteABI, provider);
    uniswapGroGvtPool = new ethers.Contract(uniPoolGroGvtAddress, UniswapABI, provider);
    uniswapGroUsdcPool = new ethers.Contract(uniPoolGroUsdcAddress, UniswapABI, provider);
    groPwrdUsdcLpToken = new ethers.Contract(pwrdUsdcLpAddress, LpTokenABI, provider);
    curvePwrd3crvPool = new ethers.Contract(curvePwrd3crvPoolAddress, CurvePoolABI, provider);
    curve3Pool = new ethers.Contract(curve3poolAddress, CurvePoolABI, provider);
    curve3CrvLpToken = new ethers.Contract(curve3crvAddress, LpTokenABI, provider);
    groWethLpToken = new ethers.Contract(groWethAddress, GroWethABI, provider)
}

const checkPosition = async (addr, date) => {
    try {
        await initContracts();

        const day = moment.utc(date, "DD/MM/YYYY")
            .add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds');
        const blockTag = {
            // @ts-ignore
            blockTag: (await findBlockByDate(day, false)).block
        }

        const [
            staked_gro,
            staked_gro_gvt,
            staked_gro_usdc,
            staked_gvt,
            staked_pwrd,
            staked_gro_weth,
            unstaked_gro,
            unstaked_gro_gvt,
            unstaked_gro_usdc,
            unstaked_gvt,
            unstaked_pwrd,
            unstaked_pwrd_pool,
            unstaked_gro_weth,
        ] = await Promise.all([
            lpTokenStaker.userInfo(0, addr, blockTag),   // staked Gro
            lpTokenStaker.userInfo(1, addr, blockTag),   // staked Gro/Gvt
            lpTokenStaker.userInfo(2, addr, blockTag),   // staked Gro/Usdc
            lpTokenStaker.userInfo(3, addr, blockTag),   // staked Gvt
            lpTokenStaker.userInfo(4, addr, blockTag),   // staked Pwrd
            lpTokenStaker.userInfo(5, addr, blockTag),   // staked Gvt/Weth
            //-------------------------------------------------------
            groToken.balanceOf(addr, blockTag),          // unstaked Gro
            uniswapGroGvtPool.balanceOf(addr, blockTag), // unstaked Gro/Gvt [Uniswap pool]
            uniswapGroUsdcPool.balanceOf(addr, blockTag),// unstaked Gro/Usdc pool [Uniswap pool]
            groVault.balanceOf(addr, blockTag),          // unstaked Gvt
            groPwrd.balanceOf(addr, blockTag),           // unstaked Pwrd
            groPwrdUsdcLpToken.balanceOf(addr, blockTag),// unstaked Pwrd-3crv [Curve 3crv pool]
            groWethLpToken.balanceOf(addr, blockTag),    //  Unstaked Gro/Weth
        ]);

        logger.info(`staked_gro: ${staked_gro}`);
        logger.info(`staked_gro_gvt: ${staked_gro_gvt}`);
        logger.info(`staked_gro_usdc: ${staked_gro_usdc}`);
        logger.info(`staked_gvt: ${staked_gvt}`);
        logger.info(`staked_pwrd: ${staked_pwrd}`);
        logger.info(`staked_gro_weth: ${staked_gro_weth}`);
        logger.info(`unstaked_gro: ${unstaked_gro}`);
        logger.info(`unstaked_gro_gvt: ${unstaked_gro_gvt}`);
        logger.info(`unstaked_gro_usdc: ${unstaked_gro_usdc}`);
        logger.info(`unstaked_gvt: ${unstaked_gvt}`);
        logger.info(`unstaked_pwrd: ${unstaked_pwrd}`);
        logger.info(`unstaked_pwrd_pool: ${unstaked_pwrd_pool}`);
        logger.info(`unstaked_gro_weth: ${unstaked_gro_weth}`);

    } catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->checkPosition(): ${err}`);
    }
}

/// @notice Load token amounts for elegible wallets having GVT or PWRD
/// @param  from The start position in the wallets list to start loading data
/// @param  end The end position in the wallets list to finish loading data
/// @dev    In order to avoid potential alchemy limitations, it is preferred to load data
///         in different loops (e.g.: by 250 records)
const airdrop4Handler = async (from, to) => {
    try {
        const addr = AIRDROP4_ADDRESSES;

        if (to < from) {
            logger.info(`to (${to}) must be greater than from (${from})`);
            return;
        } else if (to > addr.length - 1) {
            logger.info(`to (${to}) is greater than addresses count (${addr.length - 1})`);
            return;
        } else if (from > addr.length - 1) {
            logger.info(`from (${from}) is greater than addresses count (${addr.length - 1})`);
            return;
        }

        await initContracts();

        const blockTag = {
            blockTag: END_SNAPSHOT_BLOCK
        }

        const res = await truncateTempAirdrop4();
        if (!res) {
            logger.info(`Error truncating table AIRDROP4_TEMP`);
            return;
        }

        for (let i = from; i <= to; i++) {
            const [
                staked_gro,
                staked_gro_gvt,
                staked_gro_usdc,
                staked_gvt,
                staked_pwrd,
                staked_gro_weth,
                unstaked_gro,
                unstaked_gro_gvt,
                unstaked_gro_usdc,
                unstaked_gvt,
                unstaked_pwrd,
                unstaked_pwrd_pool,
                unstaked_gro_weth,
            ] = await Promise.all([
                lpTokenStaker.userInfo(0, addr[i], blockTag),   // staked Gro
                lpTokenStaker.userInfo(1, addr[i], blockTag),   // staked Gro/Gvt
                lpTokenStaker.userInfo(2, addr[i], blockTag),   // staked Gro/Usdc
                lpTokenStaker.userInfo(3, addr[i], blockTag),   // staked Gvt
                lpTokenStaker.userInfo(4, addr[i], blockTag),   // staked Pwrd
                lpTokenStaker.userInfo(5, addr[i], blockTag),   // staked Gvt/Weth
                //-------------------------------------------------------
                groToken.balanceOf(addr[i], blockTag),          // unstaked Gro
                uniswapGroGvtPool.balanceOf(addr[i], blockTag), // unstaked Gro/Gvt [Uniswap pool]
                uniswapGroUsdcPool.balanceOf(addr[i], blockTag),// unstaked Gro/Usdc pool [Uniswap pool]
                groVault.balanceOf(addr[i], blockTag),          // unstaked Gvt
                groPwrd.balanceOf(addr[i], blockTag),           // unstaked Pwrd
                groPwrdUsdcLpToken.balanceOf(addr[i], blockTag),// unstaked Pwrd-3crv [Curve 3crv pool]
                groWethLpToken.balanceOf(addr[i], blockTag),    //  Unstaked Gro/Weth
            ]);

            // Store record into DB (AIRDROP4_TEMP)
            const record = [
                END_SNAPSHOT_BLOCK,                 // block
                END_SNAPSHOT_DATE,                  // Date
                END_SNAPSHOT_TIMESTAMP,             // Timestamp
                getNetworkId(),                     // mainnet
                addr[i],                            // address
                printUsd(staked_gro.amount),        // staked Gro
                printUsd(staked_gro_gvt.amount),    // staked Gro/Gvt   (*)
                printUsd(staked_gro_usdc.amount),   // staked Gro/Usdc
                printUsd(staked_gvt.amount),        // staked Gvt       (*)
                printUsd(staked_pwrd.amount),       // staked Pwrd      (*)
                printUsd(staked_gro_weth.amount),   // staked Gro/Weth
                printUsd(unstaked_gro),             // unstaked Gro
                printUsd(unstaked_gro_gvt),         // unstaked Gro/Gvt [Uniswap pool] (*)
                printUsd(unstaked_gro_usdc),        // unstaked Gro/Usdc pool [Uniswap pool]
                printUsd(unstaked_gvt),             // unstaked Gvt
                printUsd(unstaked_pwrd),            // unstaked Pwrd
                printUsd(unstaked_pwrd_pool),       // unstaked Pwrd-3crv [Curve 3crv pool] (*)
                printUsd(unstaked_gro_weth),        // unstaked Gro/Weth
                moment.utc(),                       // now
            ];

            const res = await loadTempAirdrop4(i, record);
            if (!res) return;
        }

        // Load all records into DB (AIRDROP_FINAL)
        await loadAirdrop4();

    } catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->airdrop4Handler(): ${err}`);
    }
}

/// @notice Load token amounts (only GVT/GRO, GVT & PWRD-3CRV) for elegible wallets
/// @param  from The start position in the wallets list to start loading data
/// @param  end The end position in the wallets list to finish loading data
/// @param  date The target data to load data (format: DD/MM/YYYY)
/// @dev    In order to avoid potential alchemy limitations, it is preferred to load data
///         in different loops (e.g.: by 250 records)
const airdrop4HandlerV2 = async (from, to, date) => {
    try {
        const day = moment.utc(date, "DD/MM/YYYY")
            .add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds');

        logger.info(`using date: ${day}`);
        // @ts-ignore
        const block = (await findBlockByDate(day, false)).block;
        logger.info(`using block ${block}`);
        const addr = AIRDROP4_ADDRESSES;

        if (to < from) {
            logger.info(`to (${to}) must be greater than from (${from})`);
            return;
        } else if (to > addr.length - 1) {
            logger.info(`to (${to}) is greater than addresses count (${addr.length - 1})`);
            return;
        } else if (from > addr.length - 1) {
            logger.info(`from (${from}) is greater than addresses count (${addr.length - 1})`);
            return;
        }

        await initContracts();

        const blockTag = {
            blockTag: block
        }

        const res = await truncateTempAirdrop4();
        if (!res) {
            logger.info(`Error truncating table AIRDROP4_TEMP`);
            return;
        }

        for (let i = from; i <= to; i++) {
            const [
                staked_gro_gvt,     // [starts on 30.10.2021]
                staked_gvt,         // [starts on 30.10.2021]
                staked_pwrd,        // [starts on 30.10.2021]
                unstaked_gro_gvt,
                unstaked_pwrd_pool,
            ] = await Promise.all([
                lpTokenStaker.userInfo(1, addr[i], blockTag),   // staked Gro/Gvt   [starts on 30.10.2021]
                lpTokenStaker.userInfo(3, addr[i], blockTag),   // staked Gvt       [starts on 30.10.2021]
                lpTokenStaker.userInfo(4, addr[i], blockTag),   // staked Pwrd      [starts on 30.10.2021]
                //-------------------------------------------------------
                uniswapGroGvtPool.balanceOf(addr[i], blockTag), // unstaked Gro/Gvt [Uniswap pool]
                groPwrdUsdcLpToken.balanceOf(addr[i], blockTag),// unstaked Pwrd-3crv [Curve 3crv pool]
            ]);

            // V2: only for staked or unstaked GVT & PWRD
            const record = [
                block,                                          // block
                day,                                            // Date
                moment.utc(day).unix(),                         // Timestamp
                getNetworkId(),                                 // mainnet
                addr[i],                                        // address
                null,                                           // staked Gro
                printUsd(staked_gro_gvt.amount),                // staked Gro/Gvt   [starts on 30.10.2021]
                null,                                           // staked Gro/Usdc
                printUsd(staked_gvt.amount),                    // staked Gvt       [starts on 30.10.2021]
                printUsd(staked_pwrd.amount),                   // staked Pwrd      [starts on 30.10.2021]
                null,                                           // staked Gro/Weth
                null,                                           // unstaked Gro
                printUsd(unstaked_gro_gvt),                     // unstaked Gro/Gvt [Uniswap pool]
                null,                                           // unstaked Gro/Usdc pool [Uniswap pool]
                null,                                           // unstaked Gvt
                null,                                           // unstaked Pwrd
                printUsd(unstaked_pwrd_pool),                   // unstaked Pwrd-3crv [Curve 3crv pool]
                null,                                           // unstaked Gro/Weth
                moment.utc(),                                   // now
            ];

            const res = await loadTempAirdrop4(i, record);
            if (!res) return;
        }

        // Load all records into DB (AIRDROP_FINAL)
        await loadAirdrop4();

    } catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->airdrop4HandlerV2(): ${err}`);
    }
}

export {
    airdrop4Handler,
    airdrop4HandlerV2,
    checkPosition,
}
