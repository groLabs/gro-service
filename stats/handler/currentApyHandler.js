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
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
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
const CURRENT_APY_SCALE = BigNumber.from(122);

// config
const launchBlock = getConfig('blockchain.start_block');
const defaultApy = getConfig('strategy_default_apy');

async function findBlockByDate(scanDate) {
    const blockFound = await scanner
        .getDate(scanDate.toDate())
        .catch((error) => {
            logger.error(error);
            logger.error(`Could not get block ${scanDate}`);
        });
    logger.info(`scanDate ${scanDate} block ${blockFound.block}`);
    return blockFound;
}

async function calcStrategyAPY(vault, strategy, startBlock, endBlock) {
    const assetChangedBlock = [startBlock, endBlock];
    const harvestedLogs = await getStrategyHavestEvents(
        strategy,
        startBlock.blockNumber,
        endBlock.blockNumber,
        providerKey
    );
    harvestedLogs.forEach((log) => {
        assetChangedBlock.push({
            blockNumber: log.blockNumber,
        });
    });

    const vaultTransferLogs = await getVaultTransferEvents(
        vault,
        startBlock.blockNumber,
        endBlock.blockNumber,
        providerKey
    );

    vaultTransferLogs.forEach((log) => {
        assetChangedBlock.push({
            blockNumber: log.blockNumber,
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
        endBlock.timestamp - startBlock.timestamp
    );
    const timeWeightedTotalAssets = totalAssets.div(totalDuration);

    logger.info(
        `TotalAssets ${totalAssets} duration ${totalDuration} timeWeightedTotalAssets ${timeWeightedTotalAssets} `
    );
    const latestBlock = sortedBlocks[sortedBlocks.length - 1];
    const expectedReturn = await strategy.expectedReturn();
    const startExpectedReturn = await strategy.expectedReturn({
        blockTag: startBlock.blockNumber,
    });
    const totalGain = latestBlock.totalGain
        .add(expectedReturn)
        .sub(sortedBlocks[0].totalGain)
        .sub(startExpectedReturn);
    logger.info(
        `timeWeightedTotalAssets ${timeWeightedTotalAssets} totalGain ${totalGain} expectedReturn ${expectedReturn} start ${sortedBlocks[0].totalGain} startExpedted ${startExpectedReturn} end ${latestBlock.totalGain}`
    );
    const apy = totalGain
        .mul(PERCENT_DECIMAL)
        .div(timeWeightedTotalAssets)
        .mul(CURRENT_APY_SCALE);
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
            const expected = await strategy.expectedReturn();
            logger.info(`get expected ${strategy.address}, ${expected}`);
            const apy =
                defaultApy[i * 2 + j] > 0
                    ? BigNumber.from(defaultApy[i * 2 + j])
                    : // eslint-disable-next-line no-await-in-loop
                      await calcStrategyAPY(
                          yearnVaults[i],
                          strategy,
                          startBlock,
                          endBlock
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

    const block7DaysAgo = await findBlockByDate(startOf7DaysAgo);
    const pnlLogs = await getPnLEvents(
        getPnl(providerKey),
        block7DaysAgo.block,
        latestBlock.number,
        providerKey
    );

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
    logger.info('SystemApy');
    const startOfUTCToday = dayjs
        .unix(latestBlock.timestamp)
        .utc()
        .startOf('day');
    logger.info(`startOfUTCToday ${startOfUTCToday}`);

    const startOf3DaysAgo = dayjs
        .unix(latestBlock.timestamp)
        .subtract(3, 'day');

    const block3DaysAgo = await findBlockByDate(startOf3DaysAgo);

    logger.info(`block3DaysAgo ${block3DaysAgo.block}`);
    // last 3d
    logger.info('----last 3d');
    const startBlock = {
        blockNumber: block3DaysAgo.block,
        timestamp: block3DaysAgo.timestamp,
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
