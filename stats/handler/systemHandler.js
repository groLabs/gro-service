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
    getVaultAndStrategyLabels,
    getBuoy,
    getYearnVaults,
} = require('../../contract/allContracts');
const logger = require('../statsLogger');
const { sendAlertMessage } = require('../../common/alertMessageSender');
const { getCurrentApy } = require('./currentApyHandler');
const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessageToChannel,
} = require('../../common/discord/discordService');
// constant
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const THRESHOLD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);
const DECIMALS = [
    BigNumber.from(10).pow(BigNumber.from(18)),
    BigNumber.from(10).pow(BigNumber.from(6)),
    BigNumber.from(10).pow(BigNumber.from(6)),
    BigNumber.from(10).pow(BigNumber.from(18)),
];

// config
const stabeCoinNames = config.get('stable_coin');
const vaultNames = config.get('vault_name');
const strategyNames = config.get('strategy_name');
const lifeguardNames = config.get('lifeguard_name');
const strategyExposure = config.get('strategy_exposure');
const strategyStablecoinExposure = config.get('strategy_stablecoin_exposure');
const protocolDisplayName = config.get('protocol_display_name');
const vaultDisplayName = config.get('vault_display_name');

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

async function checkStrategyChange(blockTag) {
    try {
        const vaults = getVaults();
        const vaultAndStrategyLabels = getVaultAndStrategyLabels();
        const yearnVaults = getYearnVaults(providerKey);
        const emergencyThreshold = BigNumber.from(500);
        const criticalThreshold = BigNumber.from(300);
        const warningThreshold = BigNumber.from(150);
        // not check curve strategy
        for (
            let vaultIndex = 0;
            vaultIndex < vaults.length - 1;
            vaultIndex += 1
        ) {
            const vaultLabel =
                vaultAndStrategyLabels[vaults[vaultIndex].address];
            const { strategies } = vaultLabel;
            for (
                let strategyIndex = 0;
                strategyIndex < strategies.length;
                strategyIndex += 1
            ) {
                const strat = strategies[strategyIndex].strategy;
                const strategyName = strategies[strategyIndex].displayName;
                const strategyStatus = await yearnVaults[vaultIndex].strategies(
                    strat.address,
                    blockTag
                );
                const totalAssets = strategyStatus.totalDebt;
                const estimatedTotalAssets = await strat.estimatedTotalAssets(
                    blockTag
                );
                const expectedReturn = estimatedTotalAssets.sub(totalAssets);
                const msg = `Strategy expected return check vaultidx ${vaultIndex} stratidx ${strategyIndex} total ${totalAssets.div(
                    DECIMALS[vaultIndex]
                )} estimated ${estimatedTotalAssets.div(
                    DECIMALS[vaultIndex]
                )} expectedReturn ${expectedReturn.div(DECIMALS[vaultIndex])}`;
                logger.info(msg);
                if (
                    expectedReturn.lt(BigNumber.from(0)) &&
                    totalAssets.gt(BigNumber.from(0))
                ) {
                    const diff = expectedReturn
                        .abs()
                        .mul(SHARE_DECIMAL)
                        .div(totalAssets);
                    const expectedReturnUsd = expectedReturn.div(
                        DECIMALS[vaultIndex]
                    );
                    const discordMessage = {
                        message: msg,
                        type: MESSAGE_TYPES.strategyAssets,
                        description: '',
                    };
                    if (diff.gte(emergencyThreshold)) {
                        discordMessage.description = `[EMERG] P2 - Strategy ${strategyName} expected return | Assets expected return is $${expectedReturnUsd} , The ratio is ${diff} BPS, threshold is ${emergencyThreshold} BPS (1/1000000)`;
                        sendAlertMessage({ discord: discordMessage });
                    } else if (diff.gte(criticalThreshold)) {
                        discordMessage.description = `[CRIT] P2 - Strategy ${strategyName} expected return | Assets expected return is $${expectedReturnUsd} , The ratio is ${diff} BPS, threshold is ${criticalThreshold} BPS (1/1000000)`;
                        sendAlertMessage({ discord: discordMessage });
                    } else if (diff.gte(warningThreshold)) {
                        discordMessage.description = `[WARN] P2 - Strategy ${strategyName} expected return | Assets expected return is $${expectedReturnUsd} , The ratio is ${diff} BPS, threshold is ${warningThreshold} BPS (1/1000000)`;
                        sendAlertMessage({ discord: discordMessage });
                    }
                    sendMessageToChannel(
                        DISCORD_CHANNELS.botLogs,
                        discordMessage
                    );
                    logger.info(
                        `totalAssets check ${discordMessage.description}`
                    );
                }
            }
        }
    } catch (e) {
        logger.error(e);
    }
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
        display_name: lifeguardNames,
        amount: await lifeGuard.totalAssetsUsd(blockTag),
    };
    return lifeGuardStats;
}

async function getExposureStats(blockTag, systemStats) {
    const exposure = getExposure(providerKey);
    logger.info(`getExposureStats blockTag : ${JSON.stringify(blockTag)}`);
    const preCal = await getInsurance(providerKey).prepareCalculation(blockTag);
    const riskResult = await exposure.getExactRiskExposure(preCal, blockTag);
    const exposureStableCoin = riskResult[0].map((concentration, i) => ({
        name: stabeCoinNames[i],
        display_name: stabeCoinNames[i],
        concentration: convertToSharePercentDecimal(concentration),
    }));
    const exposureProtocol = [];
    const protocols = [];
    const vaultsStats = systemStats.vault;
    for (let i = 0; i < vaultsStats.length; i += 1) {
        const vault = vaultsStats[i];
        const strategyList = vault.strategies;
        for (let j = 0; j < strategyList.length; j += 1) {
            const propertyIndex = i * 2 + j;
            const strategy = strategyList[j];
            const strategyProtocols = strategyExposure[propertyIndex];
            for (let k = 0; k < strategyProtocols.length; k += 1) {
                const index = protocols.indexOf(strategyProtocols[k]);
                if (index >= 0) {
                    const exposure = exposureProtocol[index];
                    exposure.concentration = exposure.concentration.add(
                        strategy.share
                    );
                } else {
                    protocols.push(strategyProtocols[k]);
                    exposureProtocol.push({
                        name: strategyProtocols[k],
                        display_name: protocolDisplayName[strategyProtocols[k]],
                        concentration: strategy.share,
                    });
                }
            }
        }
    }
    exposureProtocol.forEach((item) => {
        if (item.name === 'Curve') {
            exposureStableCoin.push({
                name: strategyStablecoinExposure[6],
                display_name: strategyStablecoinExposure[6],
                concentration: item.concentration,
            });
            item.concentration = vaultsStats[3].share;
            logger.info(`curve ${vaultsStats[3].share} ${item.concentration}`);
        }
        logger.info(`exposureProtocol ${item.name} ${item.concentration}`);
    });
    const exposureStats = {
        stablecoins: exposureStableCoin,
        protocols: exposureProtocol,
    };
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
    logger.info('check strategy expected return');
    await checkStrategyChange(blockTag);
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
    const vaultAndStrategyLabels = getVaultAndStrategyLabels();
    const vaultStats = vaultAssets.map((vaultAsset, vaultIndex) => {
        const vaultLabel = vaultAndStrategyLabels[vaults[vaultIndex].address];
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
                const strategyInfo = vaultLabel.strategies[strategyIndex];
                return {
                    name: strategy.name,
                    display_name: strategyInfo ? strategyInfo.displayName : '',
                    address: strategyInfo
                        ? strategyInfo.strategy.address
                        : undefined,
                    amount: strategy.amount,
                    last3d_apy: stratApy,
                    share: strategyPercent,
                };
            }
        );
        const reserves = strategies.pop();
        reserves.display_name = reserves.name;
        systemApy = systemApy.add(vaultApy);
        let estimatedVaultApy;
        if (vaultPercent.isZero()) {
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
            display_name: vaultDisplayName[vaultIndex],
            amount: vaultAsset.amount,
            share,
            last3d_apy: estimatedVaultApy,
            reserves,
            strategies,
        };
    });
    const systemStats = {
        total_share: systemShare,
        total_amount: systemTotal,
        last3d_apy: systemApy.div(SHARE_DECIMAL),
        lifeguard: lifeGuardStats,
        vault: vaultStats,
    };
    return systemStats;
}

module.exports = {
    getTvlStats,
    getSystemStats,
    getExposureStats,
};
