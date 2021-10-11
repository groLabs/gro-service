const { ethers, BigNumber } = require('ethers');
const { BigNumber: BN } = require('bignumber.js');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { ContractNames } = require('../../registry/registry');
const { getLatestSystemContract: getLatestContract, } = require('../../stats/common/contractStorage');
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const { getConfig } = require('../../common/configUtil');
const { findBlockByDate } = require('../common/globalUtil');
// const { callSubgraph } = require('../../common/subgraphCaller');
const { floatToBN } = require('../../common/digitalUtil');
const providerKey = 'stats_gro';
const moment = require('moment');
const { airdrop4Addr: AIRDROP4_ADDRESSES } = require('../files/airdrop4Addr');
const { loadAirdrop4 } = require('../loader/loadAirdrop4');
const { getNetworkId } = require('../common/personalUtil');

// ABIs
const UniswapRouteABI = require('../../stats/abi/uniswapRoute.json');
const UniswapABI = require('../../stats/abi/uniswap.json');
const GroABI = require('../../stats/abi/GRO.json');
const LpTokenStakerABI = require('../../stats/abi/LPTokenStaker.json');
const LpTokenABI = require('../../stats/abi/LpToken.json');
const CurvePoolABI = require('../../stats/abi/SwapPool.json');
const GroWethABI = require('../../abi/fa8e260/BalancerWeightedPool.json');

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


const getLatestSystemContract = (contractName) => getLatestContract(contractName, providerKey);

function printUsd(value) {
    return BN(value.toString())
        .div(BN(10).pow(BN(18)))
        .toFixed(7)
        .toString();
}

const initContracts = async () => {
    logger.info('init contracts');
    const provider = getAlchemyRpcProvider(providerKey);

    const groAddress = getConfig('staker_pools.contracts.gro_address');
    const stakerAddress = getConfig('staker_pools.contracts.staker_address');
    const oracleAddress = getConfig('staker_pools.contracts.gro_price_oracle_address');
    const uniPoolGroGvtAddress = getConfig('staker_pools.contracts.uniswap_gro_gvt_pool_address');
    const pwrdUsdcLpAddress = getConfig('staker_pools.contracts.pwrd_usdc_lp_address');
    const uniPoolGroUsdcAddress = getConfig('staker_pools.contracts.uniswap_gro_usdc_pool_address');
    const curvePwrd3crvPoolAddress = getConfig('staker_pools.contracts.curve_pwrd3crv_pool_address');
    const curve3poolAddress = getConfig('staker_pools.contracts.curve_3pool_address');
    const curve3crvAddress = getConfig('staker_pools.contracts.curve_3crv_address');
    const groWethAddress = getConfig('staker_pools.contracts.balancer_gro_weth_pool_address');

    lpTokenStaker = new ethers.Contract(stakerAddress, LpTokenStakerABI, provider);
    groVault = await getLatestSystemContract(ContractNames.groVault).contract;
    groPwrd = await getLatestSystemContract(ContractNames.powerD).contract;
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

/// @notice Load token amounts from elegible users for airdrop4
/// @param  from The start position in the addresses list to start loading data
/// @dev    In order to avoid potential infura/alchemy limitations, it is preferred to load data
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
            blockTag:  END_SNAPSHOT_BLOCK // null
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

            // Check amounts
            // console.log('staked gro: ', printUsd(staked_gro.amount));
            // console.log('staked gro/gvt: ', printUsd(staked_gro_gvt.amount));
            // console.log('staked gro/usdc: ', printUsd(staked_gro_usdc.amount));
            // console.log('staked gvt: ', printUsd(staked_gvt.amount));
            // console.log('staked pwrd: ', printUsd(staked_pwrd.amount));
            // console.log('staked gro/weth: ', printUsd(staked_gro_weth.amount));
            // console.log('unstaked gro: ', printUsd(unstaked_gro));
            // console.log('unstaked gro/gvt pool: ', printUsd(unstaked_gro_gvt));
            // console.log('unstaked gro/usdc pool: ', printUsd(unstaked_gro_usdc));
            // console.log('unstaked gvt: ', printUsd(unstaked_gvt));
            // console.log('unstaked pwrd: ', printUsd(unstaked_pwrd));
            // console.log('unstaked pwrd-3crv pool: ', printUsd(unstaked_pwrd_pool));
            // console.log('unstaked gro/weth:', printUsd(unstaked_gro_weth));

            // Store record into DB
            const record = [
                END_SNAPSHOT_BLOCK,                 // block
                END_SNAPSHOT_DATE,                  // Date
                END_SNAPSHOT_TIMESTAMP,             // Timestamp
                getNetworkId(),                     // mainnet
                addr[i],                            // address
                printUsd(staked_gro.amount),        // staked Gro
                printUsd(staked_gro_gvt.amount),    // staked Gro/Gvt
                printUsd(staked_gro_usdc.amount),   // staked Gro/Usdc
                printUsd(staked_gvt.amount),        // staked Gvt
                printUsd(staked_pwrd.amount),       // staked Pwrd
                printUsd(staked_gro_weth.amount),   // staked Gro/Weth
                printUsd(unstaked_gro),             // unstaked Gro
                printUsd(unstaked_gro_gvt),         // unstaked Gro/Gvt [Uniswap pool]
                printUsd(unstaked_gro_usdc),        // unstaked Gro/Usdc pool [Uniswap pool]
                printUsd(unstaked_gvt),             // unstaked Gvt
                printUsd(unstaked_pwrd),            // unstaked Pwrd
                printUsd(unstaked_pwrd_pool),       // unstaked Pwrd-3crv [Curve 3crv pool]
                printUsd(unstaked_gro_weth),        // unstaked Gro/Weth
                moment.utc(),                       // now
            ];

            const res = await loadAirdrop4(record);
            if (!res) return;
        }
    } catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->airdrop4Handler(): ${err}`);
    }
}

module.exports = {
    airdrop4Handler,
}
