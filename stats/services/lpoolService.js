const BN = require('bignumber.js');
const { ethers } = require('ethers');
const logger = require('../statsLogger');
const { getFilterEvents } = require('../../common/logFilter-new');
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const { div } = require('../../common/digitalUtil');
const { appendEventTimestamp } = require('./generatePersonTransaction');
const { getConfig } = require('../../common/configUtil');
const LPTokenStakerABI = require('../../abi/LPTokenStaker.json');
const GROVestingABI = require('../../abi/GROVesting.json');

const poolInfos = getConfig('staker_pools');
const LPTokenStakerInfo = getConfig('staker_pools.staker');
const GROVestingInfo = getConfig('staker_pools.gro_vesting');
const providerKey = 'stats_personal';
const provider = getAlchemyRpcProvider(providerKey);
const poolNames = {};
const defaultDecimal = BN(10).pow(18);

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

function getPoolName(pid) {
    let keys = Object.keys(poolNames);
    if (keys.length > 0) return poolNames[pid];
    keys = Object.keys(poolInfos);
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (key.includes('_')) {
            const { pid } = poolInfos[key];
            poolNames[pid] = key;
        }
    }
    return poolNames[pid];
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
            lp_token_amount: div(event.lp_token_amount, defaultDecimal, 2),
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
            coin_amount: div(event.lp_token_amount, defaultDecimal, 2),
            usd_amount: '0.00', // TODO
            block_number: event.block_number,
        };
        result.push(log);
    });
    return result;
}

async function getPoolsTransactions(account, endBlock = 'latest') {
    const result = [];
    const stakeAndUnstakeEvents = await fetchStakeAndUnstakeTransactions(
        account,
        endBlock
    );
    await appendEventTimestamp(stakeAndUnstakeEvents, provider);

    const stakeAndUnstakeTransactions = parseStakeUnstakeEvents(
        stakeAndUnstakeEvents
    );
    result.push(...stakeAndUnstakeTransactions);
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
