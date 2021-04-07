const { BigNumber } = require('ethers');
const {
    getGvt,
    getPwrd,
    getInsurance,
    getExposure,
    getLifeguard,
    getVaults,
    getStrategyLength,
    getDepositHandler,
    getWithdrawHandler,
    getBuoy,
} = require('../../contract/allContracts');
const logger = require('../statsLogger');
const config = require('config');

// constant
const USD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(18));
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);

// config
const vaultNames = config.get('vault_name');
const strategyNames = config.get('strategy_name');
const lifeguardNames = config.get('lifeguard_name');

const getUsdValue = async function (i, amount, blockTag) {
    const usdValue = await getBuoy().singleStableToUsd(amount, i, blockTag);
    return usdValue;
};

const calculateSharePercent = function (assets, total) {
    return total.isZero() ? ZERO : assets.mul(SHARE_DECIMAL).div(total);
};

const getVaultStats = async function (blockTag) {
    const vaults = getVaults();
    const strategyLength = getStrategyLength();
    const vaultAssets = [];
    for (let vaultIndex = 0; vaultIndex < vaults.length; vaultIndex += 1) {
        vault = vaults[vaultIndex];
        const vaultTotalAsset = await vault.totalAssets(blockTag);
        const assetUsd = await getUsdValue(
            vaultIndex,
            vaultTotalAsset,
            blockTag
        );
        const strategyStats = await getStrategiesStats(
            vault,
            vaultIndex,
            strategyLength[vaultIndex],
            vaultTotalAsset,
            blockTag
        );
        vaultAssets.push({
            stablecoin: vaultNames[vaultIndex],
            amount: assetUsd,
            strategies: strategyStats,
        });
    }
    return vaultAssets;
};

const getStrategiesStats = async function (
    vault,
    index,
    length,
    vaultTotalAsset,
    blockTag
) {
    let strategies = [];
    let reservedAssets = BigNumber.from(vaultTotalAsset);
    logger.info(`vta ${vaultTotalAsset} ra ${reservedAssets}`);
    for (let j = 0; j < length; j++) {
        const strategyAssets = await vault.getStrategyAssets(j, blockTag);
        reservedAssets = reservedAssets.sub(strategyAssets);
        const strategyAssetsUsd = await getUsdValue(
            index,
            strategyAssets,
            blockTag
        );
        strategies.push({
            name: strategyNames[j],
            amount: strategyAssetsUsd,
            assets: strategyAssets,
        });
    }
    const reservedUSD = await getUsdValue(index, reservedAssets, blockTag);
    strategies.push({
        name: vaultNames[index],
        amount: reservedUSD,
        assets: reservedAssets,
    });
    return strategies;
};

const getLifeguardStats = async function (blockTag) {
    const lifeGuard = getLifeguard();
    const lifeGuardStats = {
        name: lifeguardNames,
        amount: await lifeGuard.totalAssetsUsd(blockTag),
    };
    return lifeGuardStats;
};

const getExposureStats = async function (blockTag) {
    logger.info('ExposureStats');
    const exposure = getExposure();
    const preCal = await getInsurance().prepareCalculation(blockTag);
    const riskResult = await exposure.calcRiskExposure(preCal, blockTag);
    const exposureStableCoin = riskResult[0].map((concentration, i) => {
        return {
            stablecoin: vaultNames[i],
            concentration,
        };
    });

    const exposureProtocol = riskResult[1].map((concentration, i) => {
        return {
            name: strategyNames[i],
            concentration,
        };
    });
    const exposureStats = {
        stablecoins: exposureStableCoin,
        protocols: exposureProtocol,
    };
    return exposureStats;
};

const getTvlStats = async function (blockTag) {
    logger.info('TvlStats');
    const gvtAssets = await getGvt().totalAssets(blockTag);
    const prwdAssets = await getPwrd().totalSupply(blockTag);
    const totalAssetsUsd = gvtAssets.add(prwdAssets);
    const utilRatio = calculateSharePercent(prwdAssets, gvtAssets);
    const utilRatioLimitPD = await getDepositHandler().utilizationRatioLimitPD(
        blockTag
    );
    const utilRatioLimitGW = await getWithdrawHandler().utilizationRatioLimitGW(
        blockTag
    );

    const tvl = {
        pwrd: prwdAssets,
        gvt: gvtAssets,
        total: totalAssetsUsd,
        util_ratio: utilRatio,
        util_ratio_limit_PD: utilRatioLimitPD,
        util_ratio_limit_GW: utilRatioLimitGW,
    };
    return tvl;
};

const getSystemStats = async function (totalAssetsUsd, blockTag) {
    logger.info('SystemStats');
    const lifeGuardStats = await getLifeguardStats(blockTag);
    lifeGuardStats.share = calculateSharePercent(
        lifeGuardStats.amount,
        totalAssetsUsd
    );

    let systemTotal = lifeGuardStats.amount;
    let systemShare = lifeGuardStats.share;
    const vaultAssets = await getVaultStats(blockTag);
    const vaultStats = vaultAssets.map((vaultAsset) => {
        const strategies = vaultAsset.strategies.map((strategy) => {
            return {
                name: strategy.name,
                amount: strategy.amount,
                share: calculateSharePercent(strategy.amount, totalAssetsUsd),
            };
        });
        let share = calculateSharePercent(vaultAsset.amount, totalAssetsUsd);
        systemShare = systemShare.add(share);
        systemTotal = systemTotal.add(vaultAsset.amount);
        return {
            stablecoin: vaultAsset.stablecoin,
            amount: vaultAsset.amount,
            share,
            strategies,
        };
    });
    const systemStats = {
        total_share: systemShare,
        total_amount: systemTotal,
        lifeguard: lifeGuardStats,
        vaults: vaultStats,
    };
    return systemStats;
};

module.exports = {
    getTvlStats,
    getSystemStats,
    getExposureStats,
};
