import { BigNumber } from 'ethers';
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

const logger = require('../../statsLogger');

const providerKey = 'stats_personal';
const alchemyProvider = getAlchemyRpcProvider(providerKey);
const infuraProvider = getInfuraRpcProvider(providerKey);

async function fetchClaimEvents(account, passedEndBlock) {
    const stakerContractInfos =
        getContractsHistory()[ContractNames.LPTokenStakerV1];
    const eventFilters = [];
    const contractInterfaces = [];
    for (let i = 0; i < stakerContractInfos.length; i += 1) {
        const contractInfo = stakerContractInfos[i];
        const { startBlock } = contractInfo;
        const endBlock = contractInfo.endBlock
            ? contractInfo.endBlock
            : passedEndBlock;
        const contract = newContract(
            ContractNames.LPTokenStakerV1,
            contractInfo,
            alchemyProvider
        ).contract;
        const filter = contract.filters.LogClaim(account);
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
                `LPTokenStakerV1:${stakerContractInfos[i].address}'s LogClaim event failed:${logs[i].data}`
            );
        } else {
            resultLogs.push(...logs[i].data);
        }
    }
    return resultLogs;
}

async function getPoolsClaimTotal(account, endBlock) {
    const claimEvents = await fetchClaimEvents(account, endBlock);
    const poolsTotalResult = { all: BigNumber.from(0) };
    claimEvents.forEach((event) => {
        const [, pid, amount] = event.args;
        const pidString = pid.toString();
        if (!poolsTotalResult[pidString]) {
            poolsTotalResult[pidString] = BigNumber.from(0);
        }
        poolsTotalResult[pidString] = poolsTotalResult[pidString].add(amount);
        poolsTotalResult.all = poolsTotalResult.all.add(amount);
    });
    return poolsTotalResult;
}

async function getPoolsUnclaimAmount(account) {
    const latestStakerContractInfo =
        getLatestContractsAddress()[ContractNames.LPTokenStakerV1];
    const staker = newContract(
        ContractNames.LPTokenStakerV1,
        latestStakerContractInfo,
        alchemyProvider
    ).contract;
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
    poolIds.forEach((id) => {
        result[id] = formatNumber2(result[id], 18, 2);
    });
}

export { getPoolsClaimTotal, getPoolsUnclaimAmount };
