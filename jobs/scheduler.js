'use strict'

const schedule = require('node-schedule')
const { BigNumber } = require('ethers')
const {
    getDefaultProvider,
    getNonceManager,
    syncNounce,
    checkPendingTransactions,
} = require('../common/chainUtil')
const { pendingTransactions } = require('../common/storage')
const { sendMessageToOPSChannel } = require('../common/discord')
const { SettingError } = require('../common/customErrors')
const {
    investTrigger,
    pnlTrigger,
    rebalanceTrigger,
    harvestOneTrigger,
} = require('../jobs/triggerHandler')
const { invest, execPnl, rebalance, harvest } = require('../jobs/actionHandler')
const logger = require('../common/logger')
const config = require('config')
const provider = getDefaultProvider()
const nonceManager = getNonceManager()
let pendingTransactionSchedulerSetting = '* 30 * * * *'
let botBalanceSchedulerSetting = '* 20 * * * *'
let investTriggerSchedulerSetting = '* 0 * * * *'
let harvestTriggerSchedulerSetting = '* 15 * * * *'
let pnlTriggerSchedulerSetting = '* 30 * * * *'
let rebalanceTriggerSchedulerSetting = '* 45 * * * *'
let botBalanceWarnVault = '2000000000000000000'

if (!process.env.BOT_ADDRESS) {
    const err = new SettingError(
        'Environment variable BOT_ADDRESS are not set.'
    )
    logger.error(err)
    throw err
}

if (config.has('trigger_scheduler.invest')) {
    investTriggerSchedulerSetting = config.get('trigger_scheduler.invest')
}

if (config.has('trigger_scheduler.harvest')) {
    harvestTriggerSchedulerSetting = config.get('trigger_scheduler.harvest')
}

if (config.has('trigger_scheduler.pnl')) {
    pnlTriggerSchedulerSetting = config.get('trigger_scheduler.pnl')
}

if (config.has('trigger_scheduler.rebalance')) {
    rebalanceTriggerSchedulerSetting = config.get('trigger_scheduler.rebalance')
}

if (config.has('trigger_scheduler.pending_transaction_check')) {
    pendingTransactionSchedulerSetting = config.get(
        'trigger_scheduler.pending_transaction_check'
    )
}

if (config.has('trigger_scheduler.bot_balance_check')) {
    botBalanceSchedulerSetting = config.get(
        'trigger_scheduler.bot_balance_check'
    )
}

if (config.has('bot_balance_warn')) {
    botBalanceWarnVault = config.get('bot_balance_warn')
}

const checkBotAccountBalance = function () {
    schedule.scheduleJob(botBalanceSchedulerSetting, async function () {
        const botAccount = process.env.BOT_ADDRESS
        const balance = await nonceManager.getBalance()
        if (balance.lt(BigNumber.from(botBalanceWarnVault))) {
            logger.info(`bot: ${botAccount} balance ${balance.toString()}`)
            sendMessageToOPSChannel(
                `Bot ${botAccount}' balance is ${balance} and less than warn vaule ${botBalanceWarnVault}`
            )
        }
    })
}

const checkLongPendingTransactions = async function () {
    schedule.scheduleJob(pendingTransactionSchedulerSetting, async function () {
        logger.info(`schedulePendingTransactionsCheck running at ${Date.now()}`)
        const transactionTypes = pendingTransactions.keys()
        if (transactionTypes == 0) return

        Array.from(transactionTypes).forEach(async (type) => {
            const oldTransaction = pendingTransactions.get(type)
            const hash = oldTransaction.hash
            const transactionReceipt = await provider
                .getTransactionReceipt(hash)
                .catch((err) => {
                    logger.error(err)
                    sendMessageToOPSChannel(
                        `${type} ${hash} getTransactionReceipt error.`
                    )
                    return null
                })
            const timestamps = Date.now() - oldTransaction.createdTime
            if (!transactionReceipt || timestamps > 6000) {
                // transactionReceipt == null, pending > 6s, resend
                const signedTX = await nonceManager.signTransaction(
                    oldTransaction.transactionRequest
                )
                const transactionResponse = await nonceManager.sendTransaction(
                    signedTX
                )
                pendingTransactions.set(type, {
                    blockNumber: oldTransaction.blockNumber,
                    reSendTimes: oldTransaction.reSendTimes + 1,
                    hash: transactionResponse.hash,
                    createdTime: Date.now(),
                    transactionRequest: {
                        nonce: transactionResponse.nonce,
                        gasPrice: transactionResponse.gasPrice.hex,
                        gasLimit: transactionResponse.gasPrice.hex,
                        to: transactionResponse.to,
                        value: transactionResponse.value.hex,
                        data: transactionResponse.data,
                        chainId: transactionResponse.chainId,
                        from: transactionResponse.from,
                    },
                })
                pendingTransactions.delete(type)
                return
            }

            // remove hash from pending transactions
            pendingTransactions.delete(type)

            if (transactionReceipt.status == 1) {
                sendMessageToOPSChannel(`${type} ${hash} successfully.`)
                logger.info(`${type} ${hash} mined.`)
            } else {
                sendMessageToOPSChannel(`${type} ${hash} reverted.`)
                logger.info(`${type} ${hash} reverted.`)
            }
        })
    })
}

const investTriggerScheduler = async function () {
    schedule.scheduleJob(investTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await investTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await provider.getBlockNumber()
        await syncNounce()
        await invest(currectBlockNumber, triggerResult.params)
    })
}

const pnlTriggerScheduler = async function () {
    schedule.scheduleJob(pnlTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await pnlTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await provider.getBlockNumber()
        await syncNounce()
        await execPnl(currectBlockNumber)
    })
}

const rebalanceTriggerScheduler = async function () {
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await rebalanceTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await provider.getBlockNumber()
        await syncNounce()
        await rebalance(currectBlockNumber, triggerResult.params)
    })
}

const harvestTriggerScheduler = async function () {
    schedule.scheduleJob(harvestTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await harvestOneTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await provider.getBlockNumber()
        await syncNounce()
        await harvest(currectBlockNumber, triggerResult.params)
    })
}

const startAllJobs = function () {
    checkBotAccountBalance()
    investTriggerScheduler()
    harvestTriggerScheduler()
    pnlTriggerScheduler()
    rebalanceTriggerScheduler()
    //checkLongPendingTransactions();
}

module.exports = {
    startAllJobs,
}
