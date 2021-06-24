/* eslint-disable no-await-in-loop */
const config = require('config');
const { BigNumber } = require('ethers');
const {
    getController,
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

const { getCurrentApy } = require('./currentApyHandler');

// constant
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const THRESHOLD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);

// config
const stabeCoinNames = config.get('stable_coin');
const vaultNames = config.get('vault_name');
const protocolNames = config.get('protocol');
const strategyNames = config.get('strategy_name');
const lifeguardNames = config.get('lifeguard_name');

const providerKey = 'stats_gro';

async function getUsdValue(i, amount, blockTag) {
    const usdValue = await getBuoy(providerKey).singleStableToUsd(
        amount,
        i,
        blockTag
    );
    return usdValue;
}

async function getUsdValueForLP(amount, blockTag) {
    const usdValue = await getBuoy(providerKey).lpToUsd(amount, blockTag);
    return usdValue;
}

function calculateSharePercent(assets, total) {
    return total.isZero() ? ZERO : assets.mul(SHARE_DECIMAL).div(total);
}

function convertToSharePercentDecimal(value) {
    return value.mul(SHARE_DECIMAL).div(THRESHOLD_DECIMAL);
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
    const curveVault = getCurveVault(providerKey);
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
            name: strategyNames[index * 2 + j],
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
    const vaults = getVaults(providerKey);
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
    const lifeGuard = getLifeguard(providerKey);
    const lifeGuardStats = {
        name: lifeguardNames,
        amount: await lifeGuard.totalAssetsUsd(blockTag),
    };
    return lifeGuardStats;
}

async function getExposureStats(blockTag, systemStats) {
    const exposure = getExposure(providerKey);
    logger.info(`getExposureStats blockTag : ${JSON.stringify(blockTag)}`);
    const preCal = await getInsurance(providerKey).prepareCalculation(blockTag);
    const riskResult = await exposure.calcRiskExposure(preCal, blockTag);
    const exposureStableCoin = riskResult[0].map((concentration, i) => ({
        name: stabeCoinNames[i],
        concentration: convertToSharePercentDecimal(concentration),
    }));
    const exposureProtocol = riskResult[1].map((concentration, i) => ({
        name: protocolNames[i],
        concentration: convertToSharePercentDecimal(concentration),
    }));

    // add curve 3pool exposure
    exposureProtocol.push({
        name: 'Curve',
        concentration: convertToSharePercentDecimal(riskResult[2]),
    });
    const exposureStats = {
        stablecoins: exposureStableCoin,
        protocols: exposureProtocol,
    };
    // This is hard code to show harvest exposure
    // Harvest strategy is in vault 2, strategy 0
    const harvestExposure = systemStats.vaults[2].strategies[0].share;
    exposureProtocol.push({
        name: protocolNames[3],
        concentration: harvestExposure,
    });
    logger.info(
        `calculate harvest exposure all:${exposureProtocol[0].concentration} harvest:${harvestExposure}`
    );
    return exposureStats;
}

async function getTvlStats(blockTag) {
    logger.info('TvlStats');
    const gvtAssets = await getGvt(providerKey).totalAssets(blockTag);
    const prwdAssets = await getPwrd(providerKey).totalSupply(blockTag);
    const totalAssetsUsd = gvtAssets.add(prwdAssets);
    const utilRatio = calculateSharePercent(prwdAssets, gvtAssets);
    const controller = getController(providerKey);
    const utilRatioLimitPD = await controller.utilisationRatioLimitPwrd(
        blockTag
    );
    const utilRatioLimitGW = await controller.utilisationRatioLimitGvt(
        blockTag
    );

    const tvl = {
        pwrd: prwdAssets,
        gvt: gvtAssets,
        total: totalAssetsUsd,
        util_ratio: utilRatio,
        util_ratio_limit_PD: convertToSharePercentDecimal(utilRatioLimitPD),
        util_ratio_limit_GW: convertToSharePercentDecimal(utilRatioLimitGW),
    };
    return tvl;
}

async function getSystemStats(totalAssetsUsd, blockTag) {
    logger.info('SystemStats');
    const vaults = getVaults();
    const lifeGuardStats = await getLifeguardStats(blockTag);
    lifeGuardStats.share = calculateSharePercent(
        lifeGuardStats.amount,
        totalAssetsUsd
    );
    lifeGuardStats.last3d_apy = BigNumber.from(0);

    let systemTotal = lifeGuardStats.amount;
    let systemShare = lifeGuardStats.share;
    let systemApy = BigNumber.from(0);
    const vaultAssets = await getVaultStats(blockTag);
    const currentApy = await getCurrentApy();
    const vaultStats = vaultAssets.map((vaultAsset, vaultIndex) => {
        const vaultStrategyApy = currentApy[vaults[vaultIndex].address];
        let vaultApy = BigNumber.from(0);
        let vaultPercent = BigNumber.from(0);
        const strategies = vaultAsset.strategies.map(
            (strategy, strategyIndex) => {
                const strat = vaultStrategyApy.strategies[strategyIndex];
                let stratApy = BigNumber.from(0);
                if (strat !== undefined) {
                    logger.info(`strat apy ${strat.address} ${strat.apy}`);
                    stratApy = strat.apy;
                }
                const strategyPercent = calculateSharePercent(
                    strategy.amount,
                    totalAssetsUsd
                );
                logger.info(
                    `strat address ${strategyIndex} ${stratApy} ${strategyPercent}`
                );
                vaultApy = vaultApy.add(stratApy.mul(strategyPercent));
                vaultPercent = vaultPercent.add(strategyPercent);
                return {
                    name: strategy.name,
                    amount: strategy.amount,
                    last3d_apy: stratApy,
                    share: strategyPercent,
                };
            }
        );
        systemApy = systemApy.add(vaultApy);
        let estimatedVaultApy;
        if (vaultPercent.isZero) {
            estimatedVaultApy = ZERO;
        } else {
            estimatedVaultApy = vaultApy.div(vaultPercent);
        }
        logger.info(`estimatedVaultApy ${vaultIndex} ${estimatedVaultApy}`);
        const share = calculateSharePercent(vaultAsset.amount, totalAssetsUsd);
        systemShare = systemShare.add(share);
        systemTotal = systemTotal.add(vaultAsset.amount);
        return {
            name: vaultAsset.name,
            amount: vaultAsset.amount,
            share,
            last3d_apy: estimatedVaultApy,
            strategies,
        };
    });
    const systemStats = {
        total_share: systemShare,
        total_amount: systemTotal,
        last3d_apy: systemApy.div(SHARE_DECIMAL),
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
