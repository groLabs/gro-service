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
const { ETH_DECIMAL, div } = require('../common/digitalUtil')
const { sendMessage, DISCORD_CHANNELS } = require('../discord/discordService')
const { SettingError } = require('../common/customErrors')
const {
    investTrigger,
    pnlTrigger,
    rebalanceTrigger,
    harvestOneTrigger,
} = require('../handler/triggerHandler')
const {
    invest,
    execPnl,
    rebalance,
    harvest,
} = require('../handler/actionHandler')
const logger = require('../common/logger')
const config = require('config')
const provider = getDefaultProvider()
const nonceManager = getNonceManager()
let pendingTransactionSchedulerSetting = '30 * * * *'
let botBalanceSchedulerSetting = '20 * * * *'
let investTriggerSchedulerSetting = '0 * * * *'
let harvestTriggerSchedulerSetting = '15 * * * *'
let pnlTriggerSchedulerSetting = '30 * * * *'
let rebalanceTriggerSchedulerSetting = '45 * * * *'
let botBalanceWarnVault = '2000000000000000000'

if (!process.env.BOT_ADDRESS) {
    const err = new SettingError(
        'Environment variable BOT_ADDRESS are not set.'
    )
    logger.error(err)
    throw err
}

const botAccount = process.env.BOT_ADDRESS

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

const getCurrentBlockNumber = async function () {
    const block = await provider.getBlockNumber().catch((error) => {
        logger.error(error)
        sendMessage(DISCORD_CHANNELS.botAlerts, {
            type: DISCORD_CHANNELS.botAlerts,
            timestamp: new Date(),
            result: 'Failed: Get currect block number.',
        })
        return 0
    })
    return block
}

const checkBotAccountBalance = function () {
    schedule.scheduleJob(botBalanceSchedulerSetting, async function () {
        const botAccount = process.env.BOT_ADDRESS
        const balance = await nonceManager.getBalance().catch((error) => {
            logger.error(error)
            sendMessage(DISCORD_CHANNELS.botLogs, {
                type: 'Bot Eth Balance',
                timestamp: new Date(),
                params: botAccount,
                result: 'Failed: Get Bot eth balance.',
            })
            return 0
        })
        logger.info(`bot: ${botAccount} balance ${balance.toString()}`)
        if (balance.lt(BigNumber.from(botBalanceWarnVault))) {
            sendMessage(DISCORD_CHANNELS.botLogs, {
                type: 'Bot Eth Balance',
                timestamp: new Date(),
                params: botAccount,
                result: div(balance, ETH_DECIMAL, 4),
            })
        }
    })
}

const checkLongPendingTransactions = async function () {
    schedule.scheduleJob(pendingTransactionSchedulerSetting, async function () {
        logger.info(`schedulePendingTransactionsCheck running at ${Date.now()}`)

        if (!pendingTransactions.size) return

        for (let type of pendingTransactions.keys()) {
            const oldTransaction = pendingTransactions.get(type)
            const hash = oldTransaction.hash
            const transactionReceipt = await provider
                .getTransactionReceipt(hash)
                .catch((err) => {
                    logger.error(err)
                    sendMessage(DISCORD_CHANNELS.botLogs, {
                        type: 'Bot Pending Transactions',
                        timestamp: new Date(),
                        params: botAccount,
                        result: `${type} ${hash} getTransactionReceipt error.`,
                    })
                    return null
                })
            const timestamps = Date.now() - oldTransaction.createdTime
            if (!transactionReceipt && timestamps > 3600000) {
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
                return
            }

            // remove hash from pending transactions
            pendingTransactions.delete(type)

            if (transactionReceipt.status == 1) {
                sendMessage(DISCORD_CHANNELS.botLogs, {
                    type: 'Bot Pending Transactions',
                    timestamp: new Date(),
                    params: botAccount,
                    result: `${type} ${hash} successfully.`,
                })
                logger.info(`${type} ${hash} mined.`)
            } else {
                sendMessage(DISCORD_CHANNELS.botLogs, {
                    type: 'Bot Pending Transactions',
                    timestamp: new Date(),
                    params: botAccount,
                    result: `${type} ${hash} reverted.`,
                })
                logger.info(`${type} ${hash} reverted.`)
            }
        }
    })
}

const investTriggerScheduler = async function () {
    schedule.scheduleJob(investTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await investTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await getCurrentBlockNumber()
        if (!currectBlockNumber) return

        await syncNounce()
        await invest(currectBlockNumber, triggerResult.params)
    })
}

const pnlTriggerScheduler = async function () {
    schedule.scheduleJob(pnlTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await pnlTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await getCurrentBlockNumber()
        if (!currectBlockNumber) return

        await syncNounce()
        await execPnl(currectBlockNumber)
    })
}

const rebalanceTriggerScheduler = async function () {
    schedule.scheduleJob(rebalanceTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await rebalanceTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await getCurrentBlockNumber()
        if (!currectBlockNumber) return

        await syncNounce()
        await rebalance(currectBlockNumber, triggerResult.params)
    })
}

const harvestTriggerScheduler = async function () {
    schedule.scheduleJob(harvestTriggerSchedulerSetting, async function () {
        await checkPendingTransactions()

        const triggerResult = await harvestOneTrigger()

        if (!triggerResult.needCall) return

        const currectBlockNumber = await getCurrentBlockNumber()
        if (!currectBlockNumber) return

        await syncNounce()
        await harvest(currectBlockNumber, triggerResult.params)
    })
}

const startRegularJobs = function () {
    checkBotAccountBalance()
    investTriggerScheduler()
    harvestTriggerScheduler()
    pnlTriggerScheduler()
    rebalanceTriggerScheduler()
    checkLongPendingTransactions()
}

module.exports = {
    startRegularJobs,
}
