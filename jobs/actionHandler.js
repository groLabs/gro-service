'use strict'

const { getInsurance, getPnl } = require('../contract/allContracts')
const { pendingTransactions } = require('../common/storage')
const logger = require('../common/logger')

const invest = async function (blockNumber, investParams) {
    const investResponse = await getInsurance().invest(investParams)

    if (!investResponse.hash) return

    pendingTransactions.set('invest', {
        blockNumber,
        reSendTimes: 0,
        hash: investResponse.hash,
        createdTime: Date.now(),
        transactionRequest: {
            nonce: investResponse.nonce,
            gasPrice: investResponse.gasPrice.hex,
            gasLimit: investResponse.gasLimit.hex,
            to: investResponse.to,
            value: investResponse.value.hex,
            data: investResponse.data,
            chainId: investResponse.chainId,
            from: investResponse.from,
        },
    })
}

const harvest = async function (blockNumber, harvestStrategies) {
    for (let i = 0; i < harvestStrategies.length; i++) {
        const strategyInfo = harvestStrategies[i]
        const key = `harvest-${strategyInfo.vault.address}-${strategyInfo.strategyIndex}`
        const harvestResult = await strategyInfo.vault.strategyHarvest(
            strategyInfo.strategyIndex,
            strategyInfo.callCost
        )
        pendingTransactions.set(key, {
            blockNumber,
            reSendTimes: 0,
            hash: harvestResult.hash,
            createdTime: Date.now(),
            transactionRequest: {
                nonce: harvestResult.nonce,
                gasPrice: harvestResult.gasPrice.hex,
                gasLimit: harvestResult.gasLimit.hex,
                to: harvestResult.to,
                value: harvestResult.value.hex,
                data: harvestResult.data,
                chainId: harvestResult.chainId,
                from: harvestResult.from,
            },
        })
    }
}

const execPnl = async function (blockNumber) {
    const pnl = getPnl()
    logger.info(`pnl address ${pnl.address}`)
    const pnlResponse = await pnl.execPnL(0)
    pendingTransactions.set('pnl', {
        blockNumber,
        reSendTimes: 0,
        hash: pnlResponse.hash,
        createdTime: Date.now(),
        transactionRequest: {
            nonce: pnlResponse.nonce,
            gasPrice: pnlResponse.gasPrice.hex,
            gasLimit: pnlResponse.gasLimit.hex,
            to: pnlResponse.to,
            value: pnlResponse.value.hex,
            data: pnlResponse.data,
            chainId: pnlResponse.chainId,
            from: pnlResponse.from,
        },
    })
}

const rebalance = async function (blockNumber, rebalanceParams) {
    let rebalanceReponse
    let transactionKey
    if (rebalanceParams[0]) {
        rebalanceReponse = await getInsurance().rebalance()
        transactionKey = 'rebalance'
    } else {
        rebalanceReponse = await getInsurance().topup()
        transactionKey = 'topup'
    }

    if (!rebalanceReponse.hash) return

    pendingTransactions.set(transactionKey, {
        blockNumber,
        reSendTimes: 0,
        hash: rebalanceReponse.hash,
        createdTime: Date.now(),
        transactionRequest: {
            nonce: rebalanceReponse.nonce,
            gasPrice: rebalanceReponse.gasPrice.hex,
            gasLimit: rebalanceReponse.gasLimit.hex,
            to: rebalanceReponse.to,
            value: rebalanceReponse.value.hex,
            data: rebalanceReponse.data,
            chainId: rebalanceReponse.chainId,
            from: rebalanceReponse.from,
        },
    })
}

const execActions = async function (blockNumber, triggerResult) {
    // Handle invest
    if (triggerResult[0].needCall) {
        logger.info('invest')
        await invest(blockNumber, triggerResult[0].params)
    }

    // Handle harvest
    if (triggerResult[1].needCall) {
        logger.info('harvest')
        await harvest(blockNumber, triggerResult[1].params)
    }

    // Handle Pnl
    if (triggerResult[2].needCall) {
        logger.info('pnl')
        await execPnl(blockNumber)
    }

    if (triggerResult[3].needCall) {
        logger.info('rebalance')
        await rebalance(blockNumber, triggerResult[3].params)
    }
}

module.exports = {
    invest,
    harvest,
    execPnl,
    rebalance,
    execActions,
}
