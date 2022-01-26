//@ts-nocheck
import { BigNumber } from 'ethers';
import { getConfig } from '../../common/configUtil';
import { formatNumber2 } from '../../common/digitalUtil';
import { getPoolsClaimTotal as getPoolsV1ClaimTotal } from './tokenomics/stakerPoolV1Service';
import {
    getPoolsClaimTotal as getPoolsV2ClaimTotal,
    getPoolsUnclaimAmount,
    calculateUserBalanceInPools,
} from './tokenomics/stakerPoolV2Service';

const logger = require('../statsLogger');

const poolsInfoConfig = getConfig('staker_pools');
let poolsNameInfo;

function getPoolsNameInfo() {
    if (!poolsNameInfo) {
        poolsNameInfo = {};
        const keyNames = Object.keys(poolsInfoConfig);
        keyNames.forEach((key) => {
            if (poolsInfoConfig[key].hasOwnProperty('pid')) {
                poolsNameInfo[poolsInfoConfig[key].pid] = key;
            }
        });
    }
    return poolsNameInfo;
}

function fullUpDefaultResult() {
    const result = {
        all: {
            net_reward: '0',
            balance: '0',
            rewards: { claim_now: '0', vest_all: '0' },
        },
    };
    const poolsInfo = getPoolsNameInfo();
    const pids = Object.keys(poolsInfo);
    for (let i = 0; i < pids.length; i += 1) {
        const pid = pids[i];
        result[poolsInfo[pid]] = {
            net_reward: '0',
            balance: '0',
            rewards: { claim_now: '0', vest_all: '0' },
        };
    }
    return result;
}

async function getUserPoolsInfo(account, blockNumber) {
    const result = fullUpDefaultResult();
    const poolsInfo = getPoolsNameInfo();

    const [claimTotalOnV1, claimTotalOnV2, unclaimed, balances] =
        await Promise.all([
            getPoolsV1ClaimTotal(account, blockNumber),
            getPoolsV2ClaimTotal(account, blockNumber),
            getPoolsUnclaimAmount(account),
            calculateUserBalanceInPools(account),
        ]);
    const pids = Object.keys(poolsInfo);
    let allPoolTotal = BigNumber.from(0);
    for (let i = 0; i < pids.length; i += 1) {
        const pid = pids[i];
        const poolName = poolsInfo[pid];
        // full up net_reword
        const total1 = claimTotalOnV1[pid] || BigNumber.from(0);
        const total2 = claimTotalOnV2[pid] || BigNumber.from(0);
        const total = total1.add(total2);
        allPoolTotal = allPoolTotal.add(total);
        result[poolName].net_reward = formatNumber2(total, 18, 2);

        // full up unclaimed
        if (unclaimed[pid]) {
            result[poolName].rewards = unclaimed[pid];
        }

        // full current usd balance
        if (balances[pid]) {
            result[poolName].balance = balances[pid];
        }
    }
    result.all.net_reward = formatNumber2(allPoolTotal, 18, 2);
    result.all.rewards = unclaimed.all;
    result.all.balance = balances.all;
    return result;
}
export { getUserPoolsInfo };
