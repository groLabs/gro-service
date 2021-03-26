'use strict'

const { BigNumber } = require('ethers')
const {
    getInsurance,
    getPnl,
    getVaults,
    getStrategyLength,
} = require('../contract/allContracts')
const { pendingTransactions } = require('../common/storage')
const logger = require('../common/logger')
const config = require('config')
const NONEED_TRIGGER = { needCall: false }

const investTrigger = async function () {
    if (pendingTransactions.get('invest')) {
        logger.info('Already has pending invest transaction.')
        return NONEED_TRIGGER
    }
    const investParams = await getInsurance().investTrigger()
    logger.info(`investTrigger: ${investParams}`)
    if (investParams.length) {
        return {
            needCall: true,
            params: investParams,
        }
    }
    return NONEED_TRIGGER
}

const checkVaultStrategyHarvest = function (vault, vaultIndex, strategyLength) {
    let promises = []
    for (let i = 0; i < strategyLength; i++) {
        const key = `harvest-${vault.address}-${i}`

        if (pendingTransactions.get(key)) {
            logger.info(`Already has pending ${key} transaction.`)
            continue
        }

        // Get harvest callCost
        let callCost = BigNumber.from(0)
        const callCostKey = `harvest_callcost.vault_${vaultIndex}.strategy_${i}`
        if (config.has(callCostKey)) {
            callCost = BigNumber.from(config.get(callCostKey))
        }

        promises.push(
            vault
                .strategyHarvestTrigger(i, callCost)
                .then((resolve, reject) => {
                    logger.info(`success ${vault.address} ${i} ${resolve}`)
                    return {
                        vault: vault,
                        strategyIndex: i,
                        callCost,
                        triggerResponse: resolve,
                    }
                })
        )
    }
    return promises
}

const harvestTrigger = async function () {
    const vaults = getVaults()
    const vaultsStrategyLength = getStrategyLength()
    //console.log(`vaults: ${JSON.stringify(vaults)}`)
    if (vaults.length == 0) {
        logger.info('Not fund any vault.')
        return NONEED_TRIGGER
    }

    let strategyHarvestTrigger = []
    let harvestPromises = []
    for (let i = 0; i < vaults.length; i++) {
        logger.info(`vault: ${i} : ${vaults[i].address}`)
        let vaultPromises = checkVaultStrategyHarvest(
            ...strategyHarvestTrigger,
            vaults[i],
            i,
            vaultsStrategyLength[i]
        )
        harvestPromises.push(...vaultPromises)
    }

    let triggerResponses = await Promise.all(harvestPromises)
    triggerResponses.forEach((resp) => {
        //console.log(resp);
        if (resp.triggerResponse) {
            strategyHarvestTrigger.push(resp)
        }
    })

    if (strategyHarvestTrigger.length)
        return {
            needCall: true,
            params: strategyHarvestTrigger,
        }
    return NONEED_TRIGGER
}

const harvestOneTrigger = async function () {
    const vaults = getVaults()
    if (vaults.length == 0) {
        logger.info('Not fund any vault.')
        return NONEED_TRIGGER
    }

    const vaultsStrategyLength = getStrategyLength()
    for (let i = 0; i < vaults.length; i++) {
        logger.info(`vault: ${i} : ${vaults[i].address}`)
        const vault = vaults[i]
        const strategyLength = vaultsStrategyLength[i]
        for (let j = 0; j < strategyLength; j++) {
            const key = `harvest-${vault.address}-${j}`

            if (pendingTransactions.get(key)) {
                logger.info(`Already has pending ${key} transaction.`)
                continue
            }

            // Get harvest callCost
            let callCost = BigNumber.from(0)
            const callCostKey = `harvest_callcost.vault_${i}.strategy_${j}`
            if (config.has(callCostKey)) {
                callCost = BigNumber.from(config.get(callCostKey))
            }
            const result = await vault
                .strategyHarvestTrigger(j, callCost)
                .catch((error) => {
                    logger.error(error)
                    return false
                })
            logger.info(
                `vault:${i} strategy:${j} strategyHarvestTrigger: ${result}`
            )
            if (result)
                return {
                    needCall: true,
                    params: [
                        {
                            vault: vault,
                            strategyIndex: j,
                            callCost,
                            triggerResponse: result,
                        },
                    ],
                }
        }
    }
    return NONEED_TRIGGER
}

const pnlTrigger = async function () {
    if (pendingTransactions.get('pnl')) {
        logger.info('Already has pending pnl transaction.')
        return NONEED_TRIGGER
    }

    const needPnl = await getPnl().pnlTrigger()
    logger.info(`pnl trigger. ${needPnl}`)

    if (needPnl) {
        return {
            needCall: true,
        }
    }

    return NONEED_TRIGGER
}

const rebalanceTrigger = async function () {
    if (pendingTransactions.get('rebalance')) {
        logger.info('Already has pending rebalance transaction.')
        return NONEED_TRIGGER
    }
    if (pendingTransactions.get('topup')) {
        logger.info('Already has pending topup transaction.')
        return NONEED_TRIGGER
    }

    const needRebalance = await getInsurance().rebalanceTrigger()
    logger.info(`needRebalance: ${needRebalance}`)
    if (needRebalance.length && (needRebalance[0] || needRebalance[1])) {
        return {
            needCall: true,
            params: needRebalance,
        }
    }
    return NONEED_TRIGGER
}

const callTriggers = async function () {
    let triggerPromises = []
    triggerPromises.push(investTrigger())
    triggerPromises.push(harvestTrigger())
    triggerPromises.push(pnlTrigger())
    triggerPromises.push(rebalanceTrigger())
    const triggerResult = await Promise.all(triggerPromises).catch((error) => {
        logger.error(error)
        return []
    })
    return triggerResult
}

module.exports = {
    investTrigger,
    harvestTrigger,
    harvestOneTrigger,
    pnlTrigger,
    rebalanceTrigger,
    callTriggers,
}
