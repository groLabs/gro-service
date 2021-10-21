const BN = require('bignumber.js');
const { ethers } = require('ethers');
const { getFilterEvents } = require('../../common/logFilter-new');
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const { div } = require('../../common/digitalUtil');
const { appendEventTimestamp } = require('./generatePersonTransaction');
const { getConfig } = require('../../common/configUtil');
const LPTokenStakerABI = require('../../abi/LPTokenStaker.json');
const GROVestingABI = require('../../abi/GROVesting.json');
const ERC20ABI = require('../../abi/ERC20.json');

const poolInfos = getConfig('staker_pools');
const LPTokenStakerInfo = getConfig('staker_pools.staker');
const GROVestingInfo = getConfig('staker_pools.vesting');
const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);
const poolNames = {};
const defaultDecimal = BN(10).pow(18);
const addressZero = '0x0000000000000000000000000000000000000000';
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;

const lptokenStaker = new ethers.Contract(
    LPTokenStakerInfo.address,
    LPTokenStakerABI,
    provider
);

const grovesting = new ethers.Contract(
    GROVestingInfo.address,
    GROVestingABI,
    provider
);

function getPoolName(nameKey) {
    let keys = Object.keys(poolNames);
    if (keys.length > 0) return poolNames[nameKey];
    keys = Object.keys(poolInfos);
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (key.includes('_')) {
            const { pid, lp_token: lpToken } = poolInfos[key];
            poolNames[pid] = key;
            if (lpToken) {
                poolNames[lpToken.toLowerCase()] = key;
            }
        }
    }
    return poolNames[nameKey];
}

async function fetchStakeAndUnstakeTransactions(account, endBlock) {
    // stake event
    const stakeFilter = lptokenStaker.filters.LogDeposit(account);
    stakeFilter.fromBlock = LPTokenStakerInfo.start_block;
    stakeFilter.toBlock = endBlock;

    // unstake event
    const unstakeFilter = lptokenStaker.filters.LogWithdraw(account);
    unstakeFilter.fromBlock = LPTokenStakerInfo.start_block;
    unstakeFilter.toBlock = endBlock;

    const eventPromise = [];
    eventPromise.push(
        getFilterEvents(stakeFilter, lptokenStaker.interface, providerKey)
    );
    eventPromise.push(
        getFilterEvents(unstakeFilter, lptokenStaker.interface, providerKey)
    );
    const events = [];
    const logs = await Promise.all(eventPromise);
    events.push(...logs[0]);
    events.push(...logs[1]);

    events.forEach((log) => {
        log.lp_token_amount = log.args[2].toString();
        log.pool_id = log.args[1].toString();
        log.block_number = log.blockNumber;
    });

    return events;
}

async function tokenTransferEvents(account, lpToken, startBlock, endBlock) {
    const token = new ethers.Contract(lpToken, ERC20ABI, provider);

    // transfer in
    const transferInFilter = token.filters.Transfer(null, account);
    transferInFilter.fromBlock = startBlock;
    transferInFilter.toBlock = endBlock;

    // transfer out
    const transferOutFilter = token.filters.Transfer(account);
    transferOutFilter.fromBlock = startBlock;
    transferOutFilter.toBlock = endBlock;

    const eventPromise = [];
    eventPromise.push(
        getFilterEvents(transferInFilter, token.interface, providerKey)
    );
    eventPromise.push(
        getFilterEvents(transferOutFilter, token.interface, providerKey)
    );

    const events = [];
    const logs = await Promise.all(eventPromise);
    events.push(...logs[0]);
    events.push(...logs[1]);
    return events;
}

async function uniswapAndBalancerLiquidity(
    account,
    lpToken,
    startBlock,
    endBlock
) {
    const transferEvents = await tokenTransferEvents(
        account,
        lpToken,
        startBlock,
        endBlock
    );
    const result = [];
    transferEvents.forEach((item) => {
        const { address, blockNumber, transactionHash, args } = item;
        const { from, to, value } = args;
        if (from === addressZero || to === addressZero) {
            result.push({
                pool: getPoolName(address.toLowerCase()),
                hash: transactionHash,
                tx_type:
                    from === addressZero ? 'add_liquidity' : 'remove_liquidity',
                lp_token_amount: div(value, defaultDecimal, amountDecimal),
                usd_amount: '0.00',
                block_number: blockNumber,
            });
        }
    });
    return result;
}

async function curveMetaPoolLiquidity(
    account,
    lpToken,
    curveFinancePool,
    startBlock,
    endBlock
) {
    const transferEvents = await tokenTransferEvents(
        account,
        lpToken,
        startBlock,
        endBlock
    );
    const result = [];
    transferEvents.forEach((item) => {
        const { address, blockNumber, transactionHash, args } = item;
        const { from, to, value } = args;
        if (from === addressZero || to.toLowerCase() === curveFinancePool) {
            result.push({
                pool: getPoolName(address.toLowerCase()),
                hash: transactionHash,
                tx_type:
                    from === addressZero ? 'add_liquidity' : 'remove_liquidity',
                lp_token_amount: div(value, defaultDecimal, amountDecimal),
                usd_amount: '0.00',
                block_number: blockNumber,
            });
        }
    });
    return result;
}

async function fetchAddRemoveLiquidityTransactions(account, endBlock) {
    const keys = Object.keys(poolInfos);
    const liquidityPromises = [];
    for (let i = 0; i < keys.length; i += 1) {
        const {
            lp_token: lpToken,
            start_block: startBlock,
            curve_finance_pool: curvePool,
        } = poolInfos[keys[i]];
        if (lpToken) {
            if (curvePool) {
                liquidityPromises.push(
                    curveMetaPoolLiquidity(
                        account,
                        lpToken,
                        curvePool.toLowerCase(),
                        startBlock,
                        endBlock
                    )
                );
            } else {
                liquidityPromises.push(
                    uniswapAndBalancerLiquidity(
                        account,
                        lpToken,
                        startBlock,
                        endBlock
                    )
                );
            }
        }
    }

    const result = await Promise.all(liquidityPromises);
    return result.flat(2); // flat the different pools's liquidity events to an arrary
}

// TODO : requirement is not clear now
async function fetchClaimAndExitEvents(account, endBlock) {
    // claim event
    const vestFilter = grovesting.filters.LogVest(account);
    vestFilter.fromBlock = GROVestingInfo.start_block;
    vestFilter.toBlock = endBlock;

    // exit event
    const exitFilter = grovesting.filters.LogExit(account);
    exitFilter.fromBlock = GROVestingInfo.start_block;
    exitFilter.toBlock = endBlock;

    const eventPromise = [];
    eventPromise.push(
        getFilterEvents(vestFilter, lptokenStaker.interface, providerKey)
    );
    eventPromise.push(
        getFilterEvents(exitFilter, lptokenStaker.interface, providerKey)
    );
    const events = [];
    const logs = await Promise.all(eventPromise);
    logs[0].forEach((log) => {
        log.tx_type = 'entry';
        log.coin_amount = log.args[2].toString();
    });
    logs[1].forEach((log) => {
        log.tx_type = 'exit';
        log.coin_amount = log.args[3].toString();
    });

    events.push(...logs[0]);
    events.push(...logs[1]);

    return events;
}

function parseStakeUnstakeEvents(events) {
    const result = [];
    events.forEach((event) => {
        const poolId = `${event.pool_id}`;
        const log = {
            pool: getPoolName(poolId),
            hash: event.transactionHash,
            timestamp: event.timestamp,
            lp_token_amount: div(
                event.lp_token_amount,
                defaultDecimal,
                amountDecimal
            ),
            usd_amount: '0.00', // TODO
            block_number: event.block_number,
        };
        if (event.name === 'LogDeposit') {
            log.tx_type = 'stake';
        } else {
            log.tx_type = 'unstake';
        }
        result.push(log);
    });
    return result;
}

function parseClaimExistEvents(events) {
    const result = [];
    events.forEach((event) => {
        const log = {
            token: 'gro',
            hash: event.transactionHash,
            tx_type: event.tx_type,
            timestamp: event.timestamp,
            coin_amount: div(
                event.lp_token_amount,
                defaultDecimal,
                amountDecimal
            ),
            usd_amount: '0.00', // TODO
            block_number: event.block_number,
        };
        result.push(log);
    });
    return result;
}

async function getPoolsTransactions(account, endBlock = 'latest') {
    const result = [];
    // stake & unstake
    const stakeAndUnstakeEvents = await fetchStakeAndUnstakeTransactions(
        account,
        endBlock
    );
    await appendEventTimestamp(stakeAndUnstakeEvents, provider);

    const stakeAndUnstakeTransactions = parseStakeUnstakeEvents(
        stakeAndUnstakeEvents
    );
    result.push(...stakeAndUnstakeTransactions);

    // add & remove liquidity
    const liquidityEvents = await fetchAddRemoveLiquidityTransactions(
        account,
        endBlock
    );
    await appendEventTimestamp(liquidityEvents, provider);
    result.push(...liquidityEvents);

    return result;
}

async function getRewardsTransactions(account, endBlock = 'latest') {
    const result = [];
    const claimAndExitEvents = await fetchClaimAndExitEvents(account, endBlock);
    await appendEventTimestamp(claimAndExitEvents, provider);

    const claimAndExitTransactions = parseClaimExistEvents(claimAndExitEvents);
    result.push(...claimAndExitTransactions);
    return result;
}

module.exports = {
    getPoolsTransactions,
    getRewardsTransactions,
};
