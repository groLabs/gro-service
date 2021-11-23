"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPosition = exports.airdrop4HandlerV2 = exports.airdrop4Handler = void 0;
const ethers_1 = require("ethers");
const bignumber_js_1 = require("bignumber.js");
const registry_1 = require("../../registry/registry");
const contractStorage_1 = require("../../stats/common/contractStorage");
const chainUtil_1 = require("../../common/chainUtil");
const configUtil_1 = require("../../common/configUtil");
const globalUtil_1 = require("../common/globalUtil");
const providerKey = 'stats_gro';
const moment_1 = __importDefault(require("moment"));
// const { airdrop4Addr: AIRDROP4_ADDRESSES } = require('../files/airdrop4Addr');
// const { airdrop4AddrGvtStaking: AIRDROP4_ADDRESSES } = require('../files/airdrop4AddrGvtStaking');
const { airdrop4StakingFinal: AIRDROP4_ADDRESSES } = require('../files/airdrop4stakingFinal');
const loadAirdrop4_1 = require("../loader/loadAirdrop4");
const personalUtil_1 = require("../common/personalUtil");
// ABIs
const uniswapRoute_json_1 = __importDefault(require("../../stats/abi/uniswapRoute.json"));
const uniswap_json_1 = __importDefault(require("../../stats/abi/uniswap.json"));
const GroABI = require('../../stats/abi/GRO.json');
const LPTokenStaker_json_1 = __importDefault(require("../../stats/abi/LPTokenStaker.json"));
const LpToken_json_1 = __importDefault(require("../../stats/abi/LpToken.json"));
const SwapPool_json_1 = __importDefault(require("../../stats/abi/SwapPool.json"));
const BalancerWeightedPool_json_1 = __importDefault(require("../../abi/fa8e260/BalancerWeightedPool.json"));
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
const END_SNAPSHOT_DATE = moment_1.default.unix(END_SNAPSHOT_TIMESTAMP).utc();
const END_SNAPSHOT_BLOCK = 13374853;
const getLatestSystemContract = (contractName) => (0, contractStorage_1.getLatestSystemContract)(contractName, providerKey);
function printUsd(value) {
    return new bignumber_js_1.BigNumber(value.toString())
        .div(new bignumber_js_1.BigNumber(10).pow(new bignumber_js_1.BigNumber(18)))
        .toFixed(7)
        .toString();
}
const initContracts = async () => {
    logger.info('init contracts');
    const provider = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
    const groAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.gro_address');
    const stakerAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.staker_address');
    const oracleAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.gro_price_oracle_address');
    const uniPoolGroGvtAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.uniswap_gro_gvt_pool_address');
    const pwrdUsdcLpAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.pwrd_usdc_lp_address');
    const uniPoolGroUsdcAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.uniswap_gro_usdc_pool_address');
    const curvePwrd3crvPoolAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.curve_pwrd3crv_pool_address');
    const curve3poolAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.curve_3pool_address');
    const curve3crvAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.curve_3crv_address');
    const groWethAddress = (0, configUtil_1.getConfig)('staker_pools.contracts.balancer_gro_weth_pool_address');
    lpTokenStaker = new ethers_1.ethers.Contract(stakerAddress, LPTokenStaker_json_1.default, provider);
    groVault = await getLatestSystemContract(registry_1.ContractNames.groVault).contract;
    groPwrd = await getLatestSystemContract(registry_1.ContractNames.powerD).contract;
    groToken = new ethers_1.ethers.Contract(groAddress, GroABI, provider);
    uniswapRoute = new ethers_1.ethers.Contract(oracleAddress, uniswapRoute_json_1.default, provider);
    uniswapGroGvtPool = new ethers_1.ethers.Contract(uniPoolGroGvtAddress, uniswap_json_1.default, provider);
    uniswapGroUsdcPool = new ethers_1.ethers.Contract(uniPoolGroUsdcAddress, uniswap_json_1.default, provider);
    groPwrdUsdcLpToken = new ethers_1.ethers.Contract(pwrdUsdcLpAddress, LpToken_json_1.default, provider);
    curvePwrd3crvPool = new ethers_1.ethers.Contract(curvePwrd3crvPoolAddress, SwapPool_json_1.default, provider);
    curve3Pool = new ethers_1.ethers.Contract(curve3poolAddress, SwapPool_json_1.default, provider);
    curve3CrvLpToken = new ethers_1.ethers.Contract(curve3crvAddress, LpToken_json_1.default, provider);
    groWethLpToken = new ethers_1.ethers.Contract(groWethAddress, BalancerWeightedPool_json_1.default, provider);
};
const checkPosition = async (addr, date) => {
    try {
        await initContracts();
        const day = moment_1.default.utc(date, "DD/MM/YYYY")
            .add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds');
        const blockTag = {
            // @ts-ignore
            blockTag: (await (0, globalUtil_1.findBlockByDate)(day, false)).block
        };
        const [staked_gro, staked_gro_gvt, staked_gro_usdc, staked_gvt, staked_pwrd, staked_gro_weth, unstaked_gro, unstaked_gro_gvt, unstaked_gro_usdc, unstaked_gvt, unstaked_pwrd, unstaked_pwrd_pool, unstaked_gro_weth,] = await Promise.all([
            lpTokenStaker.userInfo(0, addr, blockTag),
            lpTokenStaker.userInfo(1, addr, blockTag),
            lpTokenStaker.userInfo(2, addr, blockTag),
            lpTokenStaker.userInfo(3, addr, blockTag),
            lpTokenStaker.userInfo(4, addr, blockTag),
            lpTokenStaker.userInfo(5, addr, blockTag),
            //-------------------------------------------------------
            groToken.balanceOf(addr, blockTag),
            uniswapGroGvtPool.balanceOf(addr, blockTag),
            uniswapGroUsdcPool.balanceOf(addr, blockTag),
            groVault.balanceOf(addr, blockTag),
            groPwrd.balanceOf(addr, blockTag),
            groPwrdUsdcLpToken.balanceOf(addr, blockTag),
            groWethLpToken.balanceOf(addr, blockTag), //  Unstaked Gro/Weth
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
    }
    catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->checkPosition(): ${err}`);
    }
};
exports.checkPosition = checkPosition;
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
        }
        else if (to > addr.length - 1) {
            logger.info(`to (${to}) is greater than addresses count (${addr.length - 1})`);
            return;
        }
        else if (from > addr.length - 1) {
            logger.info(`from (${from}) is greater than addresses count (${addr.length - 1})`);
            return;
        }
        await initContracts();
        const blockTag = {
            blockTag: END_SNAPSHOT_BLOCK
        };
        const res = await (0, loadAirdrop4_1.truncateTempAirdrop4)();
        if (!res) {
            logger.info(`Error truncating table AIRDROP4_TEMP`);
            return;
        }
        for (let i = from; i <= to; i++) {
            const [staked_gro, staked_gro_gvt, staked_gro_usdc, staked_gvt, staked_pwrd, staked_gro_weth, unstaked_gro, unstaked_gro_gvt, unstaked_gro_usdc, unstaked_gvt, unstaked_pwrd, unstaked_pwrd_pool, unstaked_gro_weth,] = await Promise.all([
                lpTokenStaker.userInfo(0, addr[i], blockTag),
                lpTokenStaker.userInfo(1, addr[i], blockTag),
                lpTokenStaker.userInfo(2, addr[i], blockTag),
                lpTokenStaker.userInfo(3, addr[i], blockTag),
                lpTokenStaker.userInfo(4, addr[i], blockTag),
                lpTokenStaker.userInfo(5, addr[i], blockTag),
                //-------------------------------------------------------
                groToken.balanceOf(addr[i], blockTag),
                uniswapGroGvtPool.balanceOf(addr[i], blockTag),
                uniswapGroUsdcPool.balanceOf(addr[i], blockTag),
                groVault.balanceOf(addr[i], blockTag),
                groPwrd.balanceOf(addr[i], blockTag),
                groPwrdUsdcLpToken.balanceOf(addr[i], blockTag),
                groWethLpToken.balanceOf(addr[i], blockTag), //  Unstaked Gro/Weth
            ]);
            // Store record into DB (AIRDROP4_TEMP)
            const record = [
                END_SNAPSHOT_BLOCK,
                END_SNAPSHOT_DATE,
                END_SNAPSHOT_TIMESTAMP,
                (0, personalUtil_1.getNetworkId)(),
                addr[i],
                printUsd(staked_gro.amount),
                printUsd(staked_gro_gvt.amount),
                printUsd(staked_gro_usdc.amount),
                printUsd(staked_gvt.amount),
                printUsd(staked_pwrd.amount),
                printUsd(staked_gro_weth.amount),
                printUsd(unstaked_gro),
                printUsd(unstaked_gro_gvt),
                printUsd(unstaked_gro_usdc),
                printUsd(unstaked_gvt),
                printUsd(unstaked_pwrd),
                printUsd(unstaked_pwrd_pool),
                printUsd(unstaked_gro_weth),
                moment_1.default.utc(), // now
            ];
            const res = await (0, loadAirdrop4_1.loadTempAirdrop4)(i, record);
            if (!res)
                return;
        }
        // Load all records into DB (AIRDROP_FINAL)
        await (0, loadAirdrop4_1.loadAirdrop4)();
    }
    catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->airdrop4Handler(): ${err}`);
    }
};
exports.airdrop4Handler = airdrop4Handler;
/// @notice Load token amounts (only GVT/GRO, GVT & PWRD-3CRV) for elegible wallets
/// @param  from The start position in the wallets list to start loading data
/// @param  end The end position in the wallets list to finish loading data
/// @param  date The target data to load data (format: DD/MM/YYYY)
/// @dev    In order to avoid potential alchemy limitations, it is preferred to load data
///         in different loops (e.g.: by 250 records)
const airdrop4HandlerV2 = async (from, to, date) => {
    try {
        const day = moment_1.default.utc(date, "DD/MM/YYYY")
            .add(23, 'hours')
            .add(59, 'minutes')
            .add(59, 'seconds');
        logger.info(`using date: ${day}`);
        // @ts-ignore
        const block = (await (0, globalUtil_1.findBlockByDate)(day, false)).block;
        logger.info(`using block ${block}`);
        const addr = AIRDROP4_ADDRESSES;
        if (to < from) {
            logger.info(`to (${to}) must be greater than from (${from})`);
            return;
        }
        else if (to > addr.length - 1) {
            logger.info(`to (${to}) is greater than addresses count (${addr.length - 1})`);
            return;
        }
        else if (from > addr.length - 1) {
            logger.info(`from (${from}) is greater than addresses count (${addr.length - 1})`);
            return;
        }
        await initContracts();
        const blockTag = {
            blockTag: block
        };
        const res = await (0, loadAirdrop4_1.truncateTempAirdrop4)();
        if (!res) {
            logger.info(`Error truncating table AIRDROP4_TEMP`);
            return;
        }
        for (let i = from; i <= to; i++) {
            const [staked_gro_gvt, // [starts on 30.10.2021]
            staked_gvt, // [starts on 30.10.2021]
            staked_pwrd, // [starts on 30.10.2021]
            unstaked_gro_gvt, unstaked_pwrd_pool,] = await Promise.all([
                lpTokenStaker.userInfo(1, addr[i], blockTag),
                lpTokenStaker.userInfo(3, addr[i], blockTag),
                lpTokenStaker.userInfo(4, addr[i], blockTag),
                //-------------------------------------------------------
                uniswapGroGvtPool.balanceOf(addr[i], blockTag),
                groPwrdUsdcLpToken.balanceOf(addr[i], blockTag), // unstaked Pwrd-3crv [Curve 3crv pool]
            ]);
            // V2: only for staked or unstaked GVT & PWRD
            const record = [
                block,
                day,
                moment_1.default.utc(day).unix(),
                (0, personalUtil_1.getNetworkId)(),
                addr[i],
                null,
                printUsd(staked_gro_gvt.amount),
                null,
                printUsd(staked_gvt.amount),
                printUsd(staked_pwrd.amount),
                null,
                null,
                printUsd(unstaked_gro_gvt),
                null,
                null,
                null,
                printUsd(unstaked_pwrd_pool),
                null,
                moment_1.default.utc(), // now
            ];
            const res = await (0, loadAirdrop4_1.loadTempAirdrop4)(i, record);
            if (!res)
                return;
        }
        // Load all records into DB (AIRDROP_FINAL)
        await (0, loadAirdrop4_1.loadAirdrop4)();
    }
    catch (err) {
        logger.error(`**DB: Error in airdrop4Handler.js->airdrop4HandlerV2(): ${err}`);
    }
};
exports.airdrop4HandlerV2 = airdrop4HandlerV2;
