import BN from 'bignumber.js';
import { ethers, BigNumber } from 'ethers';
import { ContractNames } from '../../../registry/registry';
import {
    getContractsHistory,
    getLatestContractsAddress,
} from '../../../registry/registryLoader';
import { newContract } from '../../common/contractStorage';
import { getEvents } from '../../../common/logFilter';
import {
    getAlchemyRpcProvider,
    getInfuraRpcProvider,
} from '../../../common/chainUtil';
import { formatNumber2 } from '../../../common/digitalUtil';
import { getGroStatsMcContent } from '../statsService';

const erc20ABI = require('../../../abi/ERC20.json');
const logger = require('../../statsLogger');

const providerKey = 'stats_personal';
const alchemyProvider = getAlchemyRpcProvider(providerKey);
const infuraProvider = getInfuraRpcProvider(providerKey);
const poolsInfo = {};
let pwrdPoolID;
let latestStaker;
let latestVesting;

function getLatestStaker() {
    if (!latestStaker) {
        const latestStakerContractInfo =
            getLatestContractsAddress()[ContractNames.LPTokenStakerV2];
        latestStaker = newContract(
            ContractNames.LPTokenStakerV2,
            latestStakerContractInfo,
            alchemyProvider
        ).contract;
    }

    return latestStaker;
}
function getLatestVesting() {
    if (!latestVesting) {
        const latestVestingContractInfo =
            getLatestContractsAddress()[ContractNames.GroVesting];
        latestVesting = newContract(
            ContractNames.GroVesting,
            latestVestingContractInfo,
            alchemyProvider
        ).contract;
    }

    return latestVesting;
}

async function getPwrdPoolID() {
    if (!pwrdPoolID) {
        const staker = getLatestStaker();
        const pid = await staker.pPid();
        pwrdPoolID = pid.toString();
    }
    return pwrdPoolID;
}

async function fetchClaimEvents(eventName, account, passedEndBlock) {
    const stakerContractInfos =
        getContractsHistory()[ContractNames.LPTokenStakerV2];
    const eventFilters = [];
    const contractInterfaces = [];
    for (let i = 0; i < stakerContractInfos.length; i += 1) {
        const contractInfo = stakerContractInfos[i];
        const { startBlock } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : passedEndBlock;
        const contract = newContract(
            ContractNames.LPTokenStakerV2,
            contractInfo,
            alchemyProvider
        ).contract;
        const filter = contract.filters[eventName](account);
        filter.fromBlock = startBlock;
        filter.toBlock = endBlock;
        eventFilters.push(filter);
        contractInterfaces.push(contract.interface);
    }

    const eventPromise = [];
    for (let i = 0; i < eventFilters.length; i += 1) {
        eventPromise.push(
            getEvents(eventFilters[i], contractInterfaces[i], infuraProvider)
        );
    }
    const logs = await Promise.all(eventPromise);

    const resultLogs = [];
    for (let i = 0; i < logs.length; i += 1) {
        if (logs[i].status === 400) {
            logger.error(
                `LPTokenStakerV2:${stakerContractInfos[i].address}'s ${eventName} event failed:${logs[i].data}`
            );
        } else {
            resultLogs.push(...logs[i].data);
        }
    }
    return resultLogs;
}

async function parseSingleClaim(account, endBlock) {
    const singleClaimEvents = await fetchClaimEvents(
        'LogClaim',
        account,
        endBlock
    );
    const poolsTotalResult = { all: BigNumber.from(0) };
    singleClaimEvents.forEach((event) => {
        const [, vest, pid, amount] = event.args;
        const pidString = pid.toString();
        if (!poolsTotalResult[pidString]) {
            poolsTotalResult[pidString] = BigNumber.from(0);
        }
        // temporary set the instantUnlockPercent to 3000, but it may changed
        let distAmount = amount
            .mul(BigNumber.from(3000))
            .div(BigNumber.from(10000));
        if (vest) {
            distAmount = amount;
        }
        poolsTotalResult[pidString] =
            poolsTotalResult[pidString].add(distAmount);
        poolsTotalResult.all = poolsTotalResult.all.add(distAmount);
    });
    return poolsTotalResult;
}

async function getPoolUnclaim(account, poolId, blockNumber) {
    const staker = getLatestStaker();
    const amount = await staker
        .claimable(poolId, account, { blockTag: blockNumber })
        .catch((error) => {
            logger.error(error);
            return BigNumber.from(0);
        });
    return amount;
}

async function parseMultiClaim(account, endBlock) {
    const multiClaimEvents = await fetchClaimEvents(
        'LogMultiClaim',
        account,
        endBlock
    );
    const poolsTotalResult = { all: BigNumber.from(0) };
    for (let i = 0; i < multiClaimEvents.length; i += 1) {
        const event = multiClaimEvents[i];
        const blockNumber = event.blockNumber;
        const [, vest, pids] = event.args;
        for (let i = 0; i < pids.length; i += 1) {
            const pidString = pids[i].toString();
            if (!poolsTotalResult[pidString]) {
                poolsTotalResult[pidString] = BigNumber.from(0);
            }
            // temporary set the instantUnlockPercent to 3000, but it may changed
            const amount = await getPoolUnclaim(
                account,
                pids[i],
                blockNumber - 1
            );
            let distAmount = amount
                .mul(BigNumber.from(3000))
                .div(BigNumber.from(10000));
            if (vest) {
                distAmount = amount;
            }
            poolsTotalResult[pidString] =
                poolsTotalResult[pidString].add(distAmount);
            poolsTotalResult.all = poolsTotalResult.all.add(distAmount);
        }
    }
    return poolsTotalResult;
}

async function getPoolsClaimTotal(account, endBlock) {
    const singleClaimTotal = await parseSingleClaim(account, endBlock);
    const multiClaimTotal = await parseMultiClaim(account, endBlock);

    const signleTotalKeys = Object.keys(singleClaimTotal);
    const multiTotalKeys = Object.keys(multiClaimTotal);
    const finalKeys = [...new Set([...signleTotalKeys, ...multiTotalKeys])];
    const poolsTotalResult = {};
    finalKeys.forEach((pid) => {
        const singleValue = singleClaimTotal[pid] || BigNumber.from(0);
        const multiValue = multiClaimTotal[pid] || BigNumber.from(0);
        poolsTotalResult[pid] = singleValue.add(multiValue);
    });
    return poolsTotalResult;
}

async function getPoolsUnclaimAmount(account) {
    const staker = getLatestStaker();
    const groVesting = getLatestVesting();
    const instantUnlockPercent = await groVesting
        .instantUnlockPercent()
        .catch((error) => {
            logger.error(error);
            return BigNumber.from(0);
        });
    const poolLength = await staker.poolLength().catch((error) => {
        logger.error(error);
        return -1;
    });
    const result = { all: BigNumber.from(0) };
    for (let i = 0; i < poolLength; i += 1) {
        const amount = await staker.claimable(i, account).catch((error) => {
            logger.error(error);
            return BigNumber.from(0);
        });
        result[i] = amount;
        result.all = result.all.add(amount);
    }
    const poolIds = Object.keys(result);
    const finalResult = {};
    poolIds.forEach((id) => {
        finalResult[id] = {
            claim_now: formatNumber2(
                result[id].mul(instantUnlockPercent).div(BigNumber.from(10000)),
                18,
                2
            ),
            vest_all: formatNumber2(result[id], 18, 2),
        };
    });
    return finalResult;
}

async function getTotalLPInPool(pid) {
    if (!poolsInfo[pid]) {
        const staker = getLatestStaker();
        const poolInfo = await staker.poolInfo(pid);
        const poolLPAddress = poolInfo[3];
        logger.info(`poolLPAddress: ${poolLPAddress}`);
        const token = new ethers.Contract(
            poolLPAddress,
            erc20ABI,
            alchemyProvider
        );
        poolsInfo[pid] = { token };
    }
    const totalBalance = await poolsInfo[pid].token.balanceOf(
        getLatestStaker().address
    );
    return totalBalance;
}

async function getUserStakedPercent(account) {
    const staker = getLatestStaker();
    const poolLength = await staker.poolLength().catch((error) => {
        logger.error(error);
        return -1;
    });
    const stakedPercent = {};
    const pwrdPool = await getPwrdPoolID();
    for (let i = 0; i < poolLength; i += 1) {
        if (Number(i).toString() !== pwrdPool) {
            const userInfo = await staker
                .userInfo(i, account)
                .catch((error) => {
                    logger.error(error);
                    return [BigNumber.from(0), BigNumber.from(0)];
                });
            const poolTotal = await getTotalLPInPool(i);
            const userStakerAmountStr = userInfo[0].toString();
            if (userStakerAmountStr === '0') {
                stakedPercent[i] = new BN(0);
            } else {
                stakedPercent[i] = new BN(userStakerAmountStr).div(
                    new BN(poolTotal.toString())
                );
            }
        }
    }
    return stakedPercent;
}

async function calculateUserBalanceInPools(account) {
    const balancesPercent = await getUserStakedPercent(account);
    const groStatsMc = await getGroStatsMcContent();
    const { pools } = groStatsMc.mainnet;
    let balanceTotal = new BN(0);
    const result = { all: '0' };
    const pwrdPool = await getPwrdPoolID();
    for (let i = 0; i < pools.length; i += 1) {
        if (Number(i).toString() !== pwrdPool) {
            const { pid, tvl_staked: tvl } = pools[i];
            const usdAmount = new BN(balancesPercent[pid]).multipliedBy(
                new BN(tvl)
            );
            result[pid] = usdAmount.toFixed(2);
            balanceTotal = balanceTotal.plus(usdAmount);
        } else {
            const staker = getLatestStaker();
            const balance = await staker.getUserPwrd(account);
            result[pwrdPool] = formatNumber2(balance, 18, 2);
            balanceTotal = balanceTotal.plus(new BN(result[pwrdPool]));
        }
    }
    result.all = balanceTotal.toFixed(2);
    return result;
}

export {
    getPoolsClaimTotal,
    getPoolsUnclaimAmount,
    calculateUserBalanceInPools,
};
