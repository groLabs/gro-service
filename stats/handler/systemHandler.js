/* eslint-disable no-await-in-loop */
const { BigNumber } = require('ethers');
const logger = require('../statsLogger');
const { getCurrentApy } = require('./currentApyHandler');
const { ContractNames } = require('../../registry/registry');
const {
    getLatestStabeCoins,
    getLatestVaultsAndStrategies,
    getLatestSystemContract: getLatestContract,
} = require('../common/contractStorage');

// constant
const SHARE_DECIMAL = BigNumber.from(10).pow(BigNumber.from(6));
const THRESHOLD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(4));
const ZERO = BigNumber.from(0);

const providerKey = 'stats_gro';

function getLatestSystemContract(contractName) {
    return getLatestContract(contractName, providerKey);
}

async function getLatestVaultAdapters() {
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { vaultsAddress: adapterAddresses, contracts } = vaultAndStrateyInfo;
    const vaultAdapters = [];
    for (let i = 0; i < adapterAddresses.length; i += 1) {
        vaultAdapters.push(contracts[adapterAddresses[i]].contract);
    }
    return vaultAdapters;
}

async function getUsdValue(i, amount, blockTag) {
    const usdValue = getLatestSystemContract(
        ContractNames.buoy3Pool
    ).contract.singleStableToUsd(amount, i, blockTag);
    return usdValue;
}

async function getUsdValueForLP(amount, blockTag) {
    const usdValue = getLatestSystemContract(
        ContractNames.buoy3Pool
    ).contract.lpToUsd(amount, blockTag);
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
    const curveVault = getLatestSystemContract(
        ContractNames.CRVVaultAdaptor
    ).contract;
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

async function getStrategiesStatsOld(
    vault,
    index,
    length,
    vaultTotalAsset,
    blockTag
) {
    const strategies = [];
    let reservedAssets = BigNumber.from(vaultTotalAsset);
    logger.info(`vta ${vaultTotalAsset} ra ${reservedAssets}`);
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { contracts: vaultAndStrategies } = vaultAndStrateyInfo;
    const { contractInfo: vaultInfo, vault: yearnVault } =
        vaultAndStrategies[vault.address];
    const { strategies: strategyInfos } = yearnVault;
    for (let j = 0; j < length; j += 1) {
        const { contractInfo } = strategyInfos[j];
        const strategyAssets = await vault.getStrategyAssets(j, blockTag);
        reservedAssets = reservedAssets.sub(strategyAssets);
        const strategyAssetsUsd = await getUsdValue(
            index,
            strategyAssets,
            blockTag
        );
        strategies.push({
            name: contractInfo.metaData.N,
            amount: strategyAssetsUsd,
            assets: strategyAssets,
        });
    }
    const reservedUSD = await getUsdValue(index, reservedAssets, blockTag);
    strategies.push({
        name: vaultInfo.metaData.CN,
        amount: reservedUSD,
        assets: reservedAssets,
    });
    return strategies;
}

async function getVaultStatsOld(blockTag) {
    const vaults = await getLatestVaultAdapters();
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { contracts: vaultStrategyContracts } = vaultAndStrateyInfo;
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
        const { strategyLength, contractInfo: vaultInfo } =
            vaultStrategyContracts[vault.address];
        const strategyStats = await getStrategiesStatsOld(
            vault,
            vaultIndex,
            strategyLength,
            vaultTotalAsset,
            blockTag
        );
        vaultAssets.push({
            name: vaultInfo.metaData.N,
            amount: assetUsd,
            strategies: strategyStats,
        });
    }
    const curveVaultStats = await getCurveVaultStats(blockTag);
    vaultAssets.push(curveVaultStats);

    return vaultAssets;
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
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { contracts: vaultAndStrategies } = vaultAndStrateyInfo;
    const { contractInfo: vaultInfo, vault: yearnVault } =
        vaultAndStrategies[vault.address];
    const { strategies: strategyInfos } = yearnVault;
    for (let j = 0; j < length; j += 1) {
        const { contractInfo } = strategyInfos[j];
        const strategyAssets = await vault.getStrategyAssets(j, blockTag);
        reservedAssets = reservedAssets.sub(strategyAssets);
        const strategyAssetsUsd = await getUsdValue(
            index,
            strategyAssets,
            blockTag
        );
        strategies.push({
            name: contractInfo.metaData.N,
            amount: strategyAssetsUsd,
            assets: strategyAssets,
        });
    }
    const reservedUSD = await getUsdValue(index, reservedAssets, blockTag);
    strategies.push({
        name: vaultInfo.metaData.CN,
        amount: reservedUSD,
        assets: reservedAssets,
    });
    return strategies;
}

async function getVaultStats(blockTag) {
    const vaults = await getLatestVaultAdapters();
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { contracts: vaultStrategyContracts } = vaultAndStrateyInfo;

    const vaultAssets = [];
    for (let vaultIndex = 0; vaultIndex < vaults.length - 1; vaultIndex += 1) {
        const vault = vaults[vaultIndex];
        const vaultTotalAsset = await vault.totalAssets(blockTag);
        const assetUsd = await getUsdValue(
            vaultIndex,
            vaultTotalAsset,
            blockTag
        );
        const { strategyLength, contractInfo: vaultInfo } =
            vaultStrategyContracts[vault.address];
        const strategyStats = await getStrategiesStats(
            vault,
            vaultIndex,
            strategyLength,
            vaultTotalAsset,
            blockTag
        );
        vaultAssets.push({
            name: vaultInfo.metaData.N,
            amount: assetUsd,
            strategies: strategyStats,
        });
    }
    const curveVaultStats = await getCurveVaultStats(blockTag);
    vaultAssets.push(curveVaultStats);

    return vaultAssets;
}

async function getLifeguardStats(blockTag) {
    const lifeGuard = getLatestSystemContract(ContractNames.lifeguard);
    const { contract: lifeguardContract, contractInfo: lifeguardContractInfo } =
        lifeGuard;
    const displayName = lifeguardContractInfo.metaData.DN
        ? lifeguardContractInfo.metaData.DN
        : lifeguardContractInfo.metaData.N;
    const lifeGuardStats = {
        name: lifeguardContractInfo.metaData.N,
        display_name: displayName,
        amount: await lifeguardContract.totalAssetsUsd(blockTag),
    };
    return lifeGuardStats;
}

async function getExposureStats(blockTag, systemStats) {
    const { contract: exposure } = getLatestSystemContract(
        ContractNames.exposure
    );
    logger.info(`getExposureStats blockTag : ${JSON.stringify(blockTag)}`);
    const stabeCoins = await getLatestStabeCoins(providerKey);
    const preCal = await getLatestSystemContract(
        ContractNames.insurance
    ).contract.prepareCalculation(blockTag);
    const riskResult = await exposure.getExactRiskExposure(preCal, blockTag);
    const exposureStableCoin = riskResult[0].map((concentration, i) => ({
        name: stabeCoins[i],
        display_name: stabeCoins[i],
        concentration: convertToSharePercentDecimal(concentration),
    }));
    const exposureProtocol = [];
    const protocols = [];
    const vaultsStats = systemStats.vaults;
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { vaultsAddress: adapterAddresses, contracts: vaultStrategies } =
        vaultAndStrateyInfo;
    for (let i = 0; i < vaultsStats.length; i += 1) {
        const vault = vaultsStats[i];
        const { strategies } = vaultStrategies[adapterAddresses[i]].vault;
        const strategyList = vault.strategies;
        for (let j = 0; j < strategyList.length - 1; j += 1) {
            const { contractInfo } = strategies[j];
            const strategy = strategyList[j];
            const { protocols: strategyProtocols, protocolsDisplayName } =
                contractInfo;
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
                        display_name: protocolsDisplayName[k],
                        concentration: strategy.share,
                    });
                }
            }
        }
    }
    // curve's stabe coin
    const curveVaultIndex = adapterAddresses.length - 1;

    exposureProtocol.forEach((item) => {
        if (item.name === 'Curve') {
            exposureStableCoin.push({
                name: stabeCoins[curveVaultIndex],
                display_name: stabeCoins[curveVaultIndex],
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
    const gvtAssets = await getLatestSystemContract(
        ContractNames.groVault
    ).contract.totalAssets(blockTag);
    const prwdAssets = await getLatestSystemContract(
        ContractNames.powerD
    ).contract.totalSupply(blockTag);
    const totalAssetsUsd = gvtAssets.add(prwdAssets);
    const utilRatio = calculateSharePercent(prwdAssets, gvtAssets);
    const controller = getLatestSystemContract(
        ContractNames.controller
    ).contract;
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
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { contracts: vaultAdaptersInfo } = vaultAndStrateyInfo;
    const vaults = await getLatestVaultAdapters();
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
        const vaultAddress = vaults[vaultIndex].address;
        logger.info(`vault address: ${vaultAddress}`);
        const { contractInfo: vaultAdapterInfo } =
            vaultAdaptersInfo[vaultAddress];
        const strategyInfos = vaultAdaptersInfo[vaultAddress].vault.strategies;
        const vaultStrategyApy = currentApy[vaultIndex];
        let vaultApy = BigNumber.from(0);
        let vaultPercent = BigNumber.from(0);
        const strategies = vaultAsset.strategies.map(
            (strategy, strategyIndex) => {
                const strategyInfo = strategyInfos[strategyIndex];
                const strat = vaultStrategyApy.strategies[strategyIndex];
                let stratApy = BigNumber.from(0);
                if (strat !== undefined) {
                    logger.info(
                        `strat apy ${strategyInfo.contract.address} ${strat.apy}`
                    );
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
                    display_name: strategyInfo
                        ? strategyInfo.contractInfo.metaData.DN
                        : '',
                    address: strategyInfo
                        ? strategyInfo.contract.address
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
            display_name: vaultAdapterInfo.metaData.DN,
            amount: vaultAsset.amount,
            share,
            last3d_apy: estimatedVaultApy,
            reserves,
            strategies,
        };
    });
    const vaultAssetsOld = await getVaultStatsOld(blockTag);
    const oldVaultStats = vaultAssetsOld.map((vaultAsset, vaultIndex) => {
        const vaultStrategyApy = currentApy[vaultIndex];
        let vaultApy = BigNumber.from(0);
        let vaultPercent = BigNumber.from(0);
        const vaultAddress = vaults[vaultIndex].address;
        logger.info(`vaule address: ${vaultAddress}`);
        const strategies = vaultAsset.strategies.map(
            (strategy, strategyIndex) => {
                const strategyInfo =
                    vaultAdaptersInfo[vaultAddress].vault.strategies[
                        strategyIndex
                    ];
                const strat = vaultStrategyApy.strategies[strategyIndex];
                let stratApy = BigNumber.from(0);
                if (strat !== undefined) {
                    logger.info(
                        `strat apy ${strategyInfo.contract.address} ${strat.apy}`
                    );
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
        let estimatedVaultApy;
        if (vaultPercent.isZero()) {
            estimatedVaultApy = ZERO;
        } else {
            estimatedVaultApy = vaultApy.div(vaultPercent);
        }
        logger.info(`estimatedVaultApy ${vaultIndex} ${estimatedVaultApy}`);
        const share = calculateSharePercent(vaultAsset.amount, totalAssetsUsd);
        return {
            name: vaultAsset.name,
            amount: vaultAsset.amount,
            share,
            last3d_apy: estimatedVaultApy,
            strategies,
        };
    });
    logger.info(`vaultStats length: ${vaultStats.length}`);
    const systemStats = {
        total_share: systemShare,
        total_amount: systemTotal,
        last3d_apy: systemApy.div(SHARE_DECIMAL),
        lifeguard: lifeGuardStats,
        vault: vaultStats,
        vaults: oldVaultStats,
    };
    return systemStats;
}

module.exports = {
    getTvlStats,
    getSystemStats,
    getExposureStats,
};
