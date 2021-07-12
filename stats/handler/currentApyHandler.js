/* eslint-disable no-await-in-loop */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { BigNumber } = require('ethers');

dayjs.extend(utc);
const {
    getVaults,
    getYearnVaults,
    getVaultAndStrategyLabels,
    getPnl,
} = require('../../contract/allContracts');
const BlocksScanner = require('../common/blockscanner');
const logger = require('../statsLogger');
const {
    getAlchemyRpcProvider,
    getTimestampByBlockNumber,
} = require('../../common/chainUtil');
const {
    getStrategyHavestEvents,
    getVaultTransferEvents,
    getPnLEvents,
} = require('../../common/logFilter');
const { getConfig } = require('../../common/configUtil');

const providerKey = 'stats_gro';
const provider = getAlchemyRpcProvider(providerKey);
const scanner = new BlocksScanner(provider);

const FACTOR_DECIMAL = BigNumber.from(10).pow(BigNumber.from(18));
const PERCENT_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const SECONDS_IN_YEAR = BigNumber.from(31536000);
const DAYS_IN_YEAR = BigNumber.from(365);
const WEEKS_IN_YEAR = BigNumber.from(52);
const MONTHS_IN_YEAR = BigNumber.from(12);
const ZERO = BigNumber.from(0);

// config
const launchBlock = getConfig('blockchain.start_block');
const defaultApy = getConfig('strategy_default_apy');
const oldPnlAddresses = getConfig('old_pnl');

async function findBlockByDate(scanDate, after = true) {
    const blockFound = await scanner
        .getDate(scanDate.toDate(), after)
        .catch((error) => {
            logger.error(error);
            logger.error(`Could not get block ${scanDate}`);
        });
    logger.info(`scanDate ${scanDate} block ${blockFound.block}`);
    return blockFound;
}

async function searchBlockDaysAgo(timestamp, days) {
    const daysAgo = dayjs.unix(timestamp).subtract(days, 'day');
    const blockDaysAgo = await findBlockByDate(daysAgo);
    return blockDaysAgo;
}

async function getAssetsChangedEvents(vault, strategy, startBlock, endBlock) {
    const assetChangedBlock = [];
    const harvestedLogs = await getStrategyHavestEvents(
        strategy,
        startBlock.blockNumber,
        endBlock.blockNumber,
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
    const block3DaysAgo = await searchBlockDaysAgo(blockInfo.timestamp, 3);
    let startHarvestIndex = -1;
    for (let i = 0; i < reverseHarvestedEvents.length; i += 1) {
        if (reverseHarvestedEvents[i].blockNumber <= block3DaysAgo.block) {
            startHarvestIndex = i;
            break;
        }
    }
    if (startHarvestIndex < 0) {
        logger.info('could find harvest before 3days ago');
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
    const vaultTransferLogs = await getVaultTransferEvents(
        vault,
        startHarvest.blockNumber,
        endHarvest.blockNumber,
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

    const vaults = getVaults(providerKey);
    const yearnVaults = getYearnVaults(providerKey);
    const vaultAndStrategy = getVaultAndStrategyLabels();
    for (let i = 0; i < vaults.length; i += 1) {
        logger.info(`vault ${i} ${vaults[i].address}`);
        const vault = vaults[i];
        const { strategies } = vaultAndStrategy[vault.address];
        logger.info(`strategies length ${strategies.length}`);

        for (let j = 0; j < strategies.length; j += 1) {
            logger.info(`strategy ${j}`);
            const { strategy } = strategies[j];
            // eslint-disable-next-line no-await-in-loop
            const apy = await calcStrategyAPY(
                yearnVaults[i],
                strategy,
                startBlock,
                endBlock,
                BigNumber.from(defaultApy[i * 2 + j])
            );
            strategies[j].apy = apy;
        }
    }
    for (let i = 0; i < vaults.length; i += 1) {
        const vault = vaults[i];
        const vaultInfo = vaultAndStrategy[vault.address];
        for (let j = 0; j < vaultInfo.strategies.length; j += 1) {
            const { apy } = vaultInfo.strategies[j];
            logger.info(`vault ${vaultInfo.name} strategy ${j} apy ${apy}`);
        }
    }
    return vaultAndStrategy;
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

async function getHodlBonusApy() {
    const latestBlock = await provider.getBlock();
    const startOf7DaysAgo = dayjs
        .unix(latestBlock.timestamp)
        .subtract(7, 'day');
    const pnl = getPnl(providerKey);
    const block7DaysAgo = await findBlockByDate(startOf7DaysAgo);
    const pnlLogs = await getPnLEvents(
        pnl,
        block7DaysAgo.block,
        latestBlock.number,
        providerKey
    );
    for (let i = 0; i < oldPnlAddresses.length; i += 1) {
        logger.info(`oldPnlAddresses ${i} ${oldPnlAddresses[i]}`);
        const oldPnl = pnl.attach(oldPnlAddresses[i]);
        const oldPnlLogs = await getPnLEvents(
            oldPnl,
            block7DaysAgo.block,
            latestBlock.number,
            providerKey
        );
        pnlLogs.push(...oldPnlLogs);
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

    const blockStart = await searchBlockDaysAgo(latestBlock.timestamp, 10);
    if (blockStart.block < launchBlock) {
        blockStart.number = launchBlock;
        blockStart.timestamp = await getTimestampByBlockNumber(launchBlock);
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

module.exports = {
    getCurrentApy,
    getGtokenApy,
    getHodlBonusApy,
};
