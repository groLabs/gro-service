/* eslint-disable no-await-in-loop */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { BigNumber } from 'ethers';

dayjs.extend(utc);
import BlocksScanner from '../common/blockscanner';
import {
    getAlchemyRpcProvider,
    getTimestampByBlockNumber,
} from '../../common/chainUtil';
import { getSimpleFilterEvents, getFilterEvents } from '../../common/logFilter';
import { getConfig } from '../../common/configUtil';
import {
    getContractsHistory,
    getLatestContractsAddressByAddress,
} from '../../registry/registryLoader';
import { ContractNames } from '../../registry/registry';
import { newContract } from '../../registry/contracts';
import { getLatestVaultsAndStrategies } from '../common/contractStorage';

const logger = require('../statsLogger');

const providerKey = 'stats_gro';
const provider = getAlchemyRpcProvider(providerKey);
const scanner = new BlocksScanner(provider);

const PERCENT_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const SECONDS_IN_YEAR = BigNumber.from(31536000);
const WEEKS_IN_YEAR = BigNumber.from(52);
const MIN_HARVEST_DAYS = 5;
const MAX_HARVEST_DAYS = 15;

// config
const launchBlock = getConfig('blockchain.start_block');
const defaultApy = getConfig('strategy_default_apy');

async function getLatestVaultAdapters() {
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { vaultsAddress: adapterAddresses, contracts } = vaultAndStrateyInfo;
    const vaultAdapters = [];
    for (let i = 0; i < adapterAddresses.length; i += 1) {
        vaultAdapters.push(contracts[adapterAddresses[i]].contract);
    }
    return vaultAdapters;
}

async function getLatestYearnVaults() {
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { vaultsAddress: adapterAddresses, contracts } = vaultAndStrateyInfo;
    const vaults = [];
    for (let i = 0; i < adapterAddresses.length; i += 1) {
        const { vault } = contracts[adapterAddresses[i]];
        vaults.push(vault.contract);
    }
    return vaults;
}

async function getStrategies() {
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { vaultsAddress: adapterAddresses, contracts } = vaultAndStrateyInfo;
    const vaultstrategies = [];
    for (let i = 0; i < adapterAddresses.length; i += 1) {
        const { strategies } = contracts[adapterAddresses[i]].vault;
        const everyAdapterStrategies = [];
        for (let j = 0; j < strategies.length; j += 1) {
            everyAdapterStrategies.push({
                strategy: strategies[j].contract,
            });
        }
        vaultstrategies.push({ strategies: everyAdapterStrategies });
    }
    return vaultstrategies;
}

async function findBlockByDate(scanDate, after = true) {
    const blockFound = (await scanner
        .getDate(scanDate.toDate(), after)
        .catch((error) => {
            logger.error(error);
            logger.error(`Could not get block ${scanDate}`);
        })) as any;
    logger.info(`scanDate ${scanDate} block ${blockFound.block}`);
    return blockFound;
}

async function searchBlockDaysAgo(timestamp, days) {
    const daysAgo = dayjs.unix(timestamp).subtract(days, 'day');
    const blockDaysAgo = await findBlockByDate(daysAgo);
    return blockDaysAgo;
}

async function getAssetsChangedEvents(vault, strategy, startBlock, endBlock) {
    logger.info(
        `getAssetsChangedEvents : startBlock: ${startBlock.blockNumber}, endBlock: ${endBlock.blockNumber}`
    );
    logger.info(`vault: ${vault.address} strategy: ${strategy.address}`);
    const assetChangedBlock = [];
    // generate strategy harvest event filter
    const harvestFilter = strategy.filters.Harvested();
    harvestFilter.fromBlock = startBlock.blockNumber;
    harvestFilter.toBlock = endBlock.blockNumber;
    const harvestedLogs = await getSimpleFilterEvents(
        harvestFilter,
        providerKey
    );
    if (harvestedLogs.length < 2) {
        logger.info(`no enough harvest. only have ${harvestedLogs.length}`);
        return assetChangedBlock;
    }

    const reverseHarvestedEvents = harvestedLogs.sort(
        (a, b) => b.blockNumber - a.blockNumber
    );
    const endHarvest = reverseHarvestedEvents[0];
    const blockInfo = await provider.getBlock(endHarvest.blockNumber);
    const blockDaysAgo = await searchBlockDaysAgo(
        blockInfo.timestamp,
        MIN_HARVEST_DAYS
    );
    let startHarvestIndex = -1;
    for (let i = 0; i < reverseHarvestedEvents.length; i += 1) {
        if (reverseHarvestedEvents[i].blockNumber <= blockDaysAgo.block) {
            startHarvestIndex = i;
            break;
        }
    }
    if (startHarvestIndex < 0) {
        logger.info(`could find harvest before ${MIN_HARVEST_DAYS} days ago`);
        return assetChangedBlock;
    }

    reverseHarvestedEvents.forEach((log, index) => {
        if (index <= startHarvestIndex) {
            assetChangedBlock.push({
                blockNumber: log.blockNumber,
                eventType: 'Harvested',
            });
        }
    });
    const startHarvest = reverseHarvestedEvents[startHarvestIndex];

    // generate vault event filter
    const vaultTransferFilter = vault.filters.Transfer(
        null,
        '0x0000000000000000000000000000000000000000'
    );

    vaultTransferFilter.fromBlock = startHarvest.blockNumber;
    vaultTransferFilter.toBlock = endHarvest.blockNumber;
    const vaultTransferLogs = await getSimpleFilterEvents(
        vaultTransferFilter,
        providerKey
    );

    vaultTransferLogs.forEach((log) => {
        assetChangedBlock.push({
            blockNumber: log.blockNumber,
            eventType: 'Withdrawal',
        });
    });
    for (let i = 0; i < assetChangedBlock.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const block = await provider.getBlock(assetChangedBlock[i].blockNumber);
        assetChangedBlock[i].timestamp = block.timestamp;

        // eslint-disable-next-line no-await-in-loop
        logger.info(
            `assetChangedBlock[i].blockNumber: ${assetChangedBlock[i].blockNumber}`
        );
        const strategyStatus = await vault.strategies(strategy.address, {
            blockTag: assetChangedBlock[i].blockNumber,
        });
        assetChangedBlock[i].totalAssets = strategyStatus.totalDebt;
        assetChangedBlock[i].totalGain = strategyStatus.totalGain;
        assetChangedBlock[i].totalLoss = strategyStatus.totalLoss;
    }
    const sortedBlocks = assetChangedBlock.sort(
        (a, b) => a.blockNumber - b.blockNumber
    );
    return sortedBlocks;
}

async function calcStrategyAPY(
    vault,
    strategy,
    startBlock,
    endBlock,
    defaultApy
) {
    const sortedBlocks = await getAssetsChangedEvents(
        vault,
        strategy,
        startBlock,
        endBlock
    );
    if (sortedBlocks.length === 0) {
        return defaultApy;
    }
    let totalAssets = BigNumber.from(0);
    for (let i = 0; i < sortedBlocks.length; i += 1) {
        const b = sortedBlocks[i];
        logger.info(
            `sortedBlocks ${b.blockNumber} ${b.timestamp} ${b.totalAssets} ${b.totalGain} ${b.totalLoss}`
        );
        if (i + 1 < sortedBlocks.length) {
            const duration = BigNumber.from(
                sortedBlocks[i + 1].timestamp - b.timestamp
            );
            totalAssets = totalAssets.add(b.totalAssets.mul(duration));
        }
    }
    const totalDuration = BigNumber.from(
        sortedBlocks[sortedBlocks.length - 1].timestamp -
            sortedBlocks[0].timestamp
    );
    const timeWeightedTotalAssets = totalAssets.div(totalDuration);

    logger.info(
        `TotalAssets ${totalAssets} duration ${totalDuration} timeWeightedTotalAssets ${timeWeightedTotalAssets} `
    );

    const totalGain = sortedBlocks[sortedBlocks.length - 1].totalGain
        .sub(sortedBlocks[0].totalGain)
        .sub(
            sortedBlocks[sortedBlocks.length - 1].totalLoss.sub(
                sortedBlocks[0].totalLoss
            )
        );

    // .sub(startExpectedReturn);
    logger.info(
        `timeWeightedTotalAssets ${timeWeightedTotalAssets} totalGain ${totalGain} start ${
            sortedBlocks[0].totalGain
        }  end ${sortedBlocks[sortedBlocks.length - 1].totalGain}`
    );
    if (timeWeightedTotalAssets.isZero()) {
        const apy = BigNumber.from(0);

        logger.info(`apy ${apy}`);
        return apy;
    }
    const apy = totalGain
        .mul(PERCENT_DECIMAL)
        .div(timeWeightedTotalAssets)
        .mul(SECONDS_IN_YEAR)
        .div(totalDuration);

    logger.info(`apy ${apy}`);
    return apy;
}

async function calcCurrentStrategyAPY(startBlock, endBlock) {
    logger.info(
        `calculate strategy apy ${startBlock.blockNumber}  ${endBlock.blockNumber}`
    );
    const latestContractInfo = getLatestContractsAddressByAddress();
    const vaults = await getLatestVaultAdapters();
    const yearnVaults = await getLatestYearnVaults();
    const vaultStrategy = await getStrategies();
    for (let i = 0; i < vaults.length; i += 1) {
        logger.info(`vault ${i} ${vaults[i].address}`);
        const { strategies } = vaultStrategy[i];
        logger.info(`strategies length ${strategies.length}`);

        for (let j = 0; j < strategies.length; j += 1) {
            logger.info(`strategy ${j}`);
            const { strategy } = strategies[j];
            const { metaData } = latestContractInfo[strategy.address];
            // eslint-disable-next-line no-await-in-loop
            const apy = await calcStrategyAPY(
                yearnVaults[i],
                strategy,
                startBlock,
                endBlock,
                BigNumber.from(metaData.DY)
            );
            strategies[j].apy = apy;
        }
    }
    for (let i = 0; i < vaults.length; i += 1) {
        const vaultInfo = vaultStrategy[i];
        for (let j = 0; j < vaultInfo.strategies.length; j += 1) {
            const { apy } = vaultInfo.strategies[j];
            // TODO vault & stategy name in metaData
            logger.info(`vault ${i} strategy ${j} apy ${apy}`);
        }
    }
    return vaultStrategy;
}

async function getGtokenApy(systemApy, utilRatio, hodlBonus) {
    let y = BigNumber.from(300000).add(
        utilRatio.mul(BigNumber.from(3)).div(BigNumber.from(8))
    );
    // 0.6 + ( 2 * ( util_ratio - 0.8 ))
    if (utilRatio.gt(BigNumber.from(800000))) {
        y = BigNumber.from(600000).add(
            BigNumber.from(2).mul(utilRatio.sub(BigNumber.from(800000)))
        );
    }
    const pwrd2gvt = systemApy.mul(y).div(PERCENT_DECIMAL);
    logger.info(`utilRatio ${utilRatio} ${y} ${systemApy} ${pwrd2gvt}`);
    const pwrdApy = systemApy.sub(pwrd2gvt);
    const gvtApy = systemApy.add(pwrd2gvt.mul(utilRatio).div(PERCENT_DECIMAL));
    logger.info(`pwrdApy ${pwrdApy} gvtApy ${gvtApy}`);
    return {
        pwrd: pwrdApy.add(hodlBonus),
        gvt: gvtApy.add(hodlBonus),
    };
}

function getPnlEventFilters(latestBlock, block7DaysAgo) {
    const filters = [];
    const startBlock = block7DaysAgo.block;
    const contractHistory = getContractsHistory()[ContractNames.pnl];
    for (let i = 0; i < contractHistory.length; i += 1) {
        const contractInfo = contractHistory[i];
        if (!contractInfo.endBlock || contractInfo.endBlock > startBlock) {
            const pnlContract = newContract(ContractNames.pnl, contractInfo, {
                providerKey,
            }).contract;
            const filter = pnlContract.filters.LogPnLExecution();
            if (contractInfo.startBlock < startBlock) {
                filter.fromBlock = startBlock;
            } else {
                filter.fromBlock = contractInfo.startBlock;
            }

            filter.toBlock = contractInfo.endBlock || latestBlock.number;
            filters.push({
                filter,
                interface: pnlContract.interface,
            });
        }
    }
    return filters;
}

async function getHodlBonusApy() {
    const latestBlock = await provider.getBlock();
    const startOf7DaysAgo = dayjs
        .unix(latestBlock.timestamp)
        .subtract(7, 'day');
    const block7DaysAgo = await findBlockByDate(startOf7DaysAgo);

    // handler pnl filters
    const pnlFilters = getPnlEventFilters(latestBlock, block7DaysAgo);
    const pnlFilterPromise = [];
    for (let i = 0; i < pnlFilters.length; i += 1) {
        const filter = pnlFilters[i];
        pnlFilterPromise.push(
            getFilterEvents(filter.filter, filter.interface, providerKey)
        );
    }
    const pnlFilterPromiseResult = await Promise.all(pnlFilterPromise);
    const pnlLogs = [];
    for (let i = 0; i < pnlFilterPromiseResult.length; i += 1) {
        pnlLogs.push(...pnlFilterPromiseResult[i].data);
    }
    let withdrawalBonus = BigNumber.from(0);
    let priceChanged = BigNumber.from(0);
    pnlLogs.forEach((log) => {
        logger.info(
            `pnlLogs ${log.blockNumber} ${log.args[4]} ${log.args[6]} ${log.args[7]} ${withdrawalBonus} ${log.args[3]} ${priceChanged}`
        );
        withdrawalBonus = withdrawalBonus.add(
            log.args[4].mul(PERCENT_DECIMAL).div(log.args[6].add(log.args[7]))
        );
        priceChanged = priceChanged.add(
            log.args[3].mul(PERCENT_DECIMAL).div(log.args[6])
        );
    });
    const hodlBonusApy = withdrawalBonus.mul(WEEKS_IN_YEAR);
    const priceApy = priceChanged.mul(WEEKS_IN_YEAR);
    logger.info(`hodlBonusApy ${hodlBonusApy} priceApy ${priceApy}`);

    return hodlBonusApy;
}

async function getCurrentApy() {
    const latestBlock = await provider.getBlock();
    logger.info('Current apy');
    const startOfUTCToday = dayjs
        .unix(latestBlock.timestamp)
        .utc()
        .startOf('day');
    logger.info(`startOfUTCToday ${startOfUTCToday}`);

    const blockStart = await searchBlockDaysAgo(
        latestBlock.timestamp,
        MAX_HARVEST_DAYS
    );
    if (blockStart.block < launchBlock) {
        blockStart.number = launchBlock;
        blockStart.timestamp = await getTimestampByBlockNumber(
            launchBlock,
            provider
        );
    }
    logger.info(`blockStart ${blockStart.block}`);
    // last 3d
    logger.info('----scan for last 10d');
    const startBlock = {
        blockNumber: blockStart.block,
        timestamp: blockStart.timestamp,
    };
    const endBlock = {
        blockNumber: latestBlock.number,
        timestamp: latestBlock.timestamp,
    };
    const currentApy = await calcCurrentStrategyAPY(startBlock, endBlock);
    return currentApy;
}

export { getCurrentApy, getGtokenApy, getHodlBonusApy };
