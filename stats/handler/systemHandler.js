/* eslint-disable no-await-in-loop */
const { BigNumber } = require('ethers');
const {
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
    sendMessageToChannel,
} = require('../../dist/common/discord/discordService');
const logger = require('../statsLogger');
const { getCurrentApy } = require('./currentApyHandler');
const { ContractNames } = require('../../registry/registry');
const { sendAlertMessage } = require('../../dist/common/alertMessageSender');
const {
    getLatestStableCoins,
    getLatestVaultsAndStrategies,
    getLatestSystemContract: getLatestContract,
} = require('../common/contractStorage');
const {
    getLatestContractsAddressByAddress,
} = require('../../registry/registryLoader');

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

async function checkStrategyChange(blockTag) {
    try {
        const vaults = await getLatestVaultAdapters();
        const vaultStrategy = await getStrategies();
        const latestContractInfo = getLatestContractsAddressByAddress();
        const yearnVaults = await getLatestYearnVaults();
        const emergencyThreshold = BigNumber.from(500);
        const criticalThreshold = BigNumber.from(300);
        const warningThreshold = BigNumber.from(150);
        // not check curve strategy
        for (
            let vaultIndex = 0;
            vaultIndex < vaults.length - 1;
            vaultIndex += 1
        ) {
            const { strategies } = vaultStrategy[vaultIndex];
            for (
                let strategyIndex = 0;
                strategyIndex < strategies.length;
                strategyIndex += 1
            ) {
                const strat = strategies[strategyIndex].strategy;
                const { metaData } = latestContractInfo[strat.address];
                const strategyName = metaData.DN;
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
                        sendAlertMessage({
                            discord: discordMessage,
                            pagerduty: {
                                title: `[EMERG] P2 - Strategy ${strategyName}'s asset isabnormal`,
                                description: discordMessage.description,
                                urgency: 'high',
                            },
                        });
                    } else if (diff.gte(criticalThreshold)) {
                        discordMessage.description = `[CRIT] P2 - Strategy ${strategyName} expected return | Assets expected return is $${expectedReturnUsd} , The ratio is ${diff} BPS, threshold is ${criticalThreshold} BPS (1/1000000)`;
                        sendAlertMessage({
                            discord: discordMessage,
                            pagerduty: {
                                title: `[CRIT] P2 - Strategy ${strategyName}'s asset is abnormal`,
                                description: discordMessage.description,
                                urgency: 'low',
                            },
                        });
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
    const stableCoinAssets = await lifeguardContract.getAssets(blockTag);
    const stablecoins = [
        {
            name: 'DAI',
            display_name: 'DAI',
            amount: stableCoinAssets[0],
        },
        {
            name: 'USDC',
            display_name: 'USDC',
            amount: stableCoinAssets[1].mul(BigNumber.from('1000000000000')), // multiple by is for mapper handler for the later, because usdc's decimal is 6 not 18
        },
        {
            name: 'USDT',
            display_name: 'USDT',
            amount: stableCoinAssets[2].mul(BigNumber.from('1000000000000')),
        },
    ];
    const lifeGuardStats = {
        stablecoins,
        name: lifeguardContractInfo.metaData.N,
        display_name: displayName,
        amount: await lifeguardContract.totalAssetsUsd(blockTag),
    };
    return lifeGuardStats;
}

async function getPrepareCalculation(systemStats, blockTag) {
    const { contract: insurance } = getLatestSystemContract(
        ContractNames.insurance
    );
    const lifeguardCurrentAssetsUsd = systemStats.lifeguard.amount;
    let totalCurrentAssetsUsd = BigNumber.from(0);
    const curveCurrentAssetsUsd =
        systemStats.vault[systemStats.vault.length - 1].amount;
    totalCurrentAssetsUsd = totalCurrentAssetsUsd.add(curveCurrentAssetsUsd);
    const vaultCurrentAssetsUsd = [];
    const vaultCurrentAssets = [];
    const stablePercents = [];
    const vaults = await getLatestVaultAdapters();
    for (let i = 0; i < systemStats.vault.length - 1; i += 1) {
        const vault = systemStats.vault[i];
        vaultCurrentAssets[i] = await vaults[i].totalAssets();
        vaultCurrentAssetsUsd[i] = vault.amount;
        totalCurrentAssetsUsd = totalCurrentAssetsUsd.add(
            vaultCurrentAssetsUsd[i]
        );
        stablePercents[i] = await insurance.underlyingTokensPercents(
            i,
            blockTag
        );
    }
    const curvePercent = await insurance.curveVaultPercent(blockTag);
    const systemState = [
        totalCurrentAssetsUsd,
        curveCurrentAssetsUsd,
        lifeguardCurrentAssetsUsd,
        vaultCurrentAssets,
        vaultCurrentAssetsUsd,
        ZERO,
        ZERO,
        ZERO,
        stablePercents,
        curvePercent,
    ];
    return systemState;
}

async function getExposureStats(blockTag, systemStats) {
    const { contract: exposure } = getLatestSystemContract(
        ContractNames.exposure
    );
    logger.info(`getExposureStats blockTag : ${JSON.stringify(blockTag)}`);
    const stableCoins = await getLatestStableCoins(providerKey);
    const { contract: bouy } = await getLatestSystemContract(
        ContractNames.buoy3Pool
    );
    const safetyCheck = await bouy.safetyCheck();
    let preCal;
    if (safetyCheck) {
        preCal = await getLatestSystemContract(
            ContractNames.insurance
        ).contract.prepareCalculation(blockTag);
    } else {
        sendAlertMessage({
            discord: {
                description:
                    '[CRIT] B11 - Price safety check returned false, deposit & withdraw actions will be reverted',
            },
        });
        preCal = await getPrepareCalculation(systemStats, blockTag);
    }
    const riskResult = await exposure.getExactRiskExposure(preCal, blockTag);
    const exposureStableCoin = riskResult[0].map((concentration, i) => ({
        name: stableCoins[i],
        display_name: stableCoins[i],
        concentration: convertToSharePercentDecimal(concentration),
    }));
    const exposureProtocol = [];
    const protocols = [];
    const vaultsStats = systemStats.vault;
    const vaultAndStrateyInfo = await getLatestVaultsAndStrategies(providerKey);
    const { vaultsAddress: adapterAddresses, contracts: vaultStrategies } =
        vaultAndStrateyInfo;
    for (let i = 0; i < vaultsStats.length; i += 1) {
        const vault = vaultsStats[i];
        const { strategies } = vaultStrategies[adapterAddresses[i]].vault;
        const strategyList = vault.strategies;
        for (let j = 0; j < strategyList.length; j += 1) {
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
    // curve's stable coin
    const curveVaultIndex = adapterAddresses.length - 1;

    exposureProtocol.forEach((item) => {
        if (item.name === 'Curve') {
            exposureStableCoin.push({
                name: stableCoins[curveVaultIndex],
                display_name: stableCoins[curveVaultIndex],
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
    logger.info('check strategy expected return');
    await checkStrategyChange(blockTag);
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
