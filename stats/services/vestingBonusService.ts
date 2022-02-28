import axios from 'axios';
import BN from 'bignumber.js';
import { BigNumber, ethers } from 'ethers';
import { ContractNames } from '../../registry/registry';
import { getConfig } from '../../common/configUtil';
import {
    getContractsHistory,
    getLatestContractsAddress,
} from '../../registry/registryLoader';
import {
    getAlchemyRpcProvider,
    getInfuraRpcProvider,
} from '../../common/chainUtil';
import { newContract } from '../common/contractStorage';
import { getEvents } from '../../common/logFilter';
import { formatNumber2 } from '../../common/digitalUtil';

const logger = require('../statsLogger');
const providerKey = 'stats_personal';
const alchemyProvider = getAlchemyRpcProvider(providerKey);
const infuraProvider = getInfuraRpcProvider(providerKey);
const routeConfig = getConfig('route');
const nodeEnv = process.env.NODE_ENV?.toLowerCase();
let latestGroHodler;
let latestGroVesting;

function getLatestHodler() {
    if (!latestGroHodler) {
        const latestStakerContractInfo =
            getLatestContractsAddress()[ContractNames.GroHodler];
        latestGroHodler = newContract(
            ContractNames.GroHodler,
            latestStakerContractInfo,
            alchemyProvider
        ).contract;
    }

    return latestGroHodler;
}

function getLatestVesting() {
    if (!latestGroVesting) {
        const latestStakerContractInfo =
            getLatestContractsAddress()[ContractNames.GroVesting];
        latestGroVesting = newContract(
            ContractNames.GroVesting,
            latestStakerContractInfo,
            alchemyProvider
        ).contract;
    }

    return latestGroVesting;
}

async function fetchClaimBonusEvents(account, passedEndBlock) {
    const stakerContractInfos = getContractsHistory()[ContractNames.GroHodler];
    const eventFilters = [];
    const contractInterfaces = [];
    for (let i = 0; i < stakerContractInfos.length; i += 1) {
        const contractInfo = stakerContractInfos[i];
        const { startBlock } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : passedEndBlock;
        const contract = newContract(
            ContractNames.GroHodler,
            contractInfo,
            alchemyProvider
        ).contract;
        const filter = contract.filters.LogBonusClaimed(account);
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
                `LPTokenStakerV2:${stakerContractInfos[i].address}'s LogBonusClaimed event failed:${logs[i].data}`
            );
        } else {
            resultLogs.push(...logs[i].data);
        }
    }
    return resultLogs;
}

async function getLockedGro(account) {
    const groVesting = getLatestVesting();
    const lockedro = await groVesting.vestingBalance(account).catch((error) => {
        logger.error(error);
        return BigNumber.from(0);
    });
    return formatNumber2(lockedro, 18, 2);
}

async function getUnclaimedBonus(account) {
    const groHodler = getLatestHodler();
    const unclaimedBonus = await groHodler['getPendingBonus(address)'](
        account
    ).catch((error) => {
        logger.error(error);
        return BigNumber.from(0);
    });
    const groVesting = getLatestVesting();
    const instantUnlockPercent = await groVesting
        .instantUnlockPercent()
        .catch((error) => {
            logger.error(error);
            return BigNumber.from(0);
        });
    const result = {
        claim_now: formatNumber2(
            unclaimedBonus.mul(instantUnlockPercent).div(BigNumber.from(10000)),
            18,
            2
        ),
        vest_all: formatNumber2(unclaimedBonus, 18, 2),
    };
    return result;
}

async function getClaimTotalBonusOnV1(account) {
    let claimTotal = new BN(0);
    let checkSumAddress = ethers.utils.getAddress(account);
    if (routeConfig.db_bot) {
        const endPoint = `${routeConfig.db_bot.hostname}/${routeConfig.db_bot.path}${checkSumAddress}`;
        const res = await axios.get(endPoint).catch((error) => {
            logger.error(error);
        });
        if (res && res.data.status === '200') {
            claimTotal = new BN(res.data.amount);
        } else if (res && res.data.status === '400') {
            logger.info(
                `Get ${account}'s claim total on tokenomicv1 from DB BOT return 400.`
            );
        } else {
            logger.error(`Get ${account}'s claim total on tokenomicv1 failed.`);
        }
    }

    return claimTotal;
}
async function getClaimTotalBonus(account, endBlock) {
    const claimEvents = await fetchClaimBonusEvents(account, endBlock);
    let totalBonus = BigNumber.from(0);
    claimEvents.forEach((event) => {
        const [, vest, amount] = event.args;
        // temporary set the instantUnlockPercent to 3000, but it may changed
        let distAmount = amount
            .mul(BigNumber.from(3000))
            .div(BigNumber.from(10000));
        if (vest) {
            distAmount = amount;
        }
        totalBonus = totalBonus.add(distAmount);
    });
    const totalBonusOnV2 = formatNumber2(totalBonus, 18, 2);
    const totalBonusOnV1 = await getClaimTotalBonusOnV1(account);
    const finalTotalBonus = new BN(totalBonusOnV2).plus(totalBonusOnV1);
    return finalTotalBonus.toFixed(2);
}

async function getUserBonusInfo(account, endBlock) {
    const [lockedGro, unclaimed, totalClaimed] = await Promise.all([
        getLockedGro(account),
        getUnclaimedBonus(account),
        getClaimTotalBonus(account, endBlock),
    ]).catch((error) => {
        logger.error(error);
        return ['0', { claim_now: '0', vest_all: '0' }, '0'];
    });
    return {
        locked_gro: lockedGro,
        net_reward: totalClaimed,
        rewards: unclaimed,
    };
}

export { getUserBonusInfo };
