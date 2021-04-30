/* eslint-disable no-await-in-loop */
const config = require('config');
const { BigNumber } = require('ethers');
const {
    getGvt,
    getPwrd,
    getInsurance,
    getExposure,
    getLifeguard,
    getVaults,
    getCurveVault,
    getStrategyLength,
    getDepositHandler,
    getWithdrawHandler,
    getBuoy,
} = require('../../contract/allContracts');
const logger = require('../statsLogger');

// constant
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);

// config
const stabeCoinNames = config.get('stable_coin');
const vaultNames = config.get('vault_name');
const protocolNames = config.get('protocol');
const strategyNames = config.get('strategy_name');
const lifeguardNames = config.get('lifeguard_name');

async function getUsdValue(i, amount, blockTag) {
    const usdValue = await getBuoy().singleStableToUsd(amount, i, blockTag);
    return usdValue;
}

async function getUsdValueForLP(amount, blockTag) {
    const usdValue = await getBuoy().lpToUsd(amount, blockTag);
    return usdValue;
}

function calculateSharePercent(assets, total) {
    return total.isZero() ? ZERO : assets.mul(SHARE_DECIMAL).div(total);
}

async function getCurveStrategyStats(vault, vaultTotalAsset, blockTag) {
    const strategies = [];
    let reservedAssets = BigNumber.from(vaultTotalAsset);
    logger.info(`vta ${vaultTotalAsset} ra ${reservedAssets}`);

    const strategyAssets = await vault.getStrategyAssets(0, blockTag);
    const strategyAssetsUsd = await getUsdValueForLP(strategyAssets, blockTag);
    strategies.push({
        name: 'XPool',
        amount: strategyAssetsUsd,
        assets: strategyAssets,
    });

    reservedAssets = reservedAssets.sub(strategyAssets);
    const reservedUSD = await getUsdValueForLP(reservedAssets, blockTag);
    strategies.push({
        name: '3CRV',
        amount: reservedUSD,
        assets: reservedAssets,
    });
    return strategies;
}

async function getCurveVaultStats(blockTag) {
    const curveVault = getCurveVault();
    const vaultTotalAsset = await curveVault.totalAssets(blockTag);
    const assetUsd = await getUsdValueForLP(vaultTotalAsset, blockTag);
    const strategyStats = await getCurveStrategyStats(
        curveVault,
        vaultTotalAsset,
        blockTag
    );
    return {
        name: 'Curve yVault',
        amount: assetUsd,
        strategies: strategyStats,
    };
}

async function getStrategiesStats(
    vault,
    index,
    length,
    vaultTotalAsset,
    blockTag
) {
    const strategies = [];
    let reservedAssets = BigNumber.from(vaultTotalAsset);
    logger.info(`vta ${vaultTotalAsset} ra ${reservedAssets}`);
    for (let j = 0; j < length; j += 1) {
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
        name: stabeCoinNames[index],
        amount: reservedUSD,
        assets: reservedAssets,
    });
    return strategies;
}

async function getVaultStats(blockTag) {
    const vaults = getVaults();
    const strategyLength = getStrategyLength();
    const vaultAssets = [];
    //
    for (let vaultIndex = 0; vaultIndex < vaults.length - 1; vaultIndex += 1) {
        const vault = vaults[vaultIndex];
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
            name: vaultNames[vaultIndex],
            amount: assetUsd,
            strategies: strategyStats,
        });
    }
    const curveVaultStats = await getCurveVaultStats(blockTag);
    vaultAssets.push(curveVaultStats);

    return vaultAssets;
}

async function getLifeguardStats(blockTag) {
    const lifeGuard = getLifeguard();
    const lifeGuardStats = {
        name: lifeguardNames,
        amount: await lifeGuard.totalAssetsUsd(blockTag),
    };
    return lifeGuardStats;
}

async function getExposureStats(blockTag) {
    const exposure = getExposure();
    logger.info(`blockTag : ${JSON.stringify(blockTag)}`);
    const preCal = await getInsurance().prepareCalculation(blockTag);
    const riskResult = await exposure.calcRiskExposure(preCal, blockTag);
    const exposureStableCoin = riskResult[0].map((concentration, i) => ({
        name: stabeCoinNames[i],
        concentration,
    }));
    const exposureProtocol = riskResult[1].map((concentration, i) => ({
        name: protocolNames[i],
        concentration,
    }));

    // add curve 3pool exposure
    exposureProtocol.push({
        name: 'Curve',
        concentration: riskResult[2],
    });
    const exposureStats = {
        stablecoins: exposureStableCoin,
        protocols: exposureProtocol,
    };
    return exposureStats;
}

async function getTvlStats(blockTag) {
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
}

async function getSystemStats(totalAssetsUsd, blockTag) {
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
        const strategies = vaultAsset.strategies.map((strategy) => ({
            name: strategy.name,
            amount: strategy.amount,
            share: calculateSharePercent(strategy.amount, totalAssetsUsd),
        }));
        const share = calculateSharePercent(vaultAsset.amount, totalAssetsUsd);
        systemShare = systemShare.add(share);
        systemTotal = systemTotal.add(vaultAsset.amount);
        return {
            name: vaultAsset.name,
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
}

module.exports = {
    getTvlStats,
    getSystemStats,
    getExposureStats,
};
