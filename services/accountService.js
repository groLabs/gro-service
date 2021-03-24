'use strict'
const { ethers } = require('ethers')
const {
<<<<<<< HEAD
    getDepositHandler,
    getWithdrawHandler,
=======
    getController,
>>>>>>> 8278840... [feat] LH- 25.03.21 - PROT-598: add personal stats endpoint
    getGroVault,
    getPowerD,
} = require('../contract/allContracts')
const { getDefaultProvider } = require('../common/chainUtil')
const { ContractCallError } = require('../common/customErrors')
const BN = require('bignumber.js')
const logger = require('../common/logger')
const config = require('config')
const BN_BASE = new BN('1000000000000000000')
let launchTime = 0
let amountDecimal = 7
let ratioDecimal = 4

if (!config.has('blockchain.start_block')) {
    const err = new SettingError('Config:blockchain.start_block not setted.')
    logger.error(err)
    throw err
}

if (config.has('blockchain.launch_timestamp')) {
    launchTime = config.get('blockchain.launch_timestamp')
}

if (config.has('stats.amount_decimal_place')) {
    amountDecimal = config.get('stats.amount_decimal_place')
}

if (config.has('stats.ratio_decimal_place')) {
    ratioDecimal = config.get('stats.ratio_decimal_place')
}

const fromBlock = config.get('blockchain.start_block')

const EVENT_TYPE = {
    deposit: 'deposit',
    withdraw: 'withdraw',
    gvtTransfer: 'gvtTransfer',
    inGvtTransfer: 'transfer-gvt-in',
    outGvtTransfer: 'transfer-gvt-out',
    pwrdTransfer: 'pwrdTransfer',
    inPwrdTransfer: 'transfer-pwrd-in',
    outPwrdTransfer: 'transfer-pwrd-out',
}

const EVENT_FRAGMENT = {}
EVENT_FRAGMENT[EVENT_TYPE.deposit] = [
    'event LogNewDeposit(address indexed user, address indexed referral, address gtoken, uint256 usdAmount, uint256[] tokens, bool whale)',
]
EVENT_FRAGMENT[EVENT_TYPE.withdraw] = [
    'event LogNewWithdrawal(address indexed user, address indexed referral, address gtoken, uint256 caseValue, uint256 usdAmount, uint256[] tokens, bool whale)',
]
EVENT_FRAGMENT[EVENT_TYPE.gvtTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount, uint256 factor)',
]
EVENT_FRAGMENT[EVENT_TYPE.pwrdTransfer] = [
    'event LogTransfer(address indexed sender, address indexed recipient, uint256 indexed amount)',
]

const getEventInfo = function (log) {
    return {
        name: log.name,
        signature: log.signature,
        topic: log.topic,
        args: log.args,
    }
}

const getFilter = function (account, type) {
<<<<<<< HEAD
    const depositHandler = getDepositHandler()
    const withdrawHandler = getWithdrawHandler()
=======
    const controller = getController()
>>>>>>> 8278840... [feat] LH- 25.03.21 - PROT-598: add personal stats endpoint
    const groVault = getGroVault()
    const powerD = getPowerD()
    let filter
    switch (type) {
        case EVENT_TYPE.deposit:
<<<<<<< HEAD
            filter = depositHandler.filters.LogNewDeposit(account)
            break
        case EVENT_TYPE.withdraw:
            filter = withdrawHandler.filters.LogNewWithdrawal(account)
=======
            filter = controller.filters.LogNewDeposit(account)
            break
        case EVENT_TYPE.withdraw:
            filter = controller.filters.LogNewWithdrawal(account)
>>>>>>> 8278840... [feat] LH- 25.03.21 - PROT-598: add personal stats endpoint
            break
        case EVENT_TYPE.inGvtTransfer:
            filter = groVault.filters.LogTransfer(null, account)
            break
        case EVENT_TYPE.outGvtTransfer:
            filter = groVault.filters.LogTransfer(account)
            break
        case EVENT_TYPE.inPwrdTransfer:
            filter = powerD.filters.LogTransfer(null, account)
            break
        case EVENT_TYPE.outPwrdTransfer:
            filter = powerD.filters.LogTransfer(account)
            break
        default:
            logger.warn(`No type: ${type}`)
    }
    return filter
}

const getDepositHistories = async function (account) {
    const provider = getDefaultProvider()
    const depositFilter = getFilter(account, EVENT_TYPE.deposit)
    depositFilter.fromBlock = fromBlock
    depositFilter.toBlock = 'latest'
    const depositLogs = await provider.getLogs(depositFilter).catch((error) => {
        logger.error(error)
        throw new ContractCallError(`Get deposit logs of ${account} failed.`)
    })
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[EVENT_TYPE.deposit]
    )
    let logs = []
    depositLogs.forEach((log) => {
        logs.push(getEventInfo(controllerInstance.parseLog(log)))
    })
    const result = { groVault: [], powerD: [] }
    if (!logs.length) return result
    const groVaultAddress = getGroVault().address
    logs.forEach((log) => {
        log.amount = new BN(log.args[3].toString())
        if (log.args[2] == groVaultAddress) {
            result.groVault.push(log)
        } else {
            result.powerD.push(log)
        }
    })
    return result
}

const getWithdrawHistories = async function (account) {
    const provider = getDefaultProvider()
    const withdrawFilter = getFilter(account, EVENT_TYPE.withdraw)
    withdrawFilter.fromBlock = fromBlock
    withdrawFilter.toBlock = 'latest'
    const withdrawLogs = await provider
        .getLogs(withdrawFilter)
        .catch((error) => {
            logger.error(error)
            throw new ContractCallError(
                `Get withdraw logs of ${account} failed.`
            )
        })
    const controllerInstance = new ethers.utils.Interface(
        EVENT_FRAGMENT[EVENT_TYPE.withdraw]
    )
    let logs = []
    withdrawLogs.forEach((log) => {
        logs.push(getEventInfo(controllerInstance.parseLog(log)))
    })
    const result = { groVault: [], powerD: [] }
    if (!logs.length) return result
    const groVaultAddress = getGroVault().address
    logs.forEach((log) => {
        log.amount = new BN(log.args[4].toString())
        if (log.args[2] == groVaultAddress) {
            result.groVault.push(log)
        } else {
            result.powerD.push(log)
        }
    })
    return result
}

const getTransferHistories = async function (account, filters, eventFragment) {
    const provider = getDefaultProvider()
    // in amount
    const inFilter = getFilter(account, filters[0])
    inFilter.fromBlock = fromBlock
    inFilter.toBlock = 'latest'
    const inLogs = await provider.getLogs(inFilter).catch((error) => {
        logger.error(error)
        throw new ContractCallError(
            `Get groVault transfer in logs of ${account} failed.`
        )
    })
    const controllerInstance = new ethers.utils.Interface(eventFragment)
    let logs1 = []
    inLogs.forEach((log) => {
        logs1.push(getEventInfo(controllerInstance.parseLog(log)))
    })

    // out amount
    const outFilter = getFilter(account, filters[1])
    outFilter.fromBlock = fromBlock
    outFilter.toBlock = 'latest'
    const outLogs = await provider.getLogs(outFilter).catch((error) => {
        logger.error(error)
        throw new ContractCallError(
            `Get groVault transfer out logs of ${account} failed.`
        )
    })
    let logs2 = []
    outLogs.forEach((log) => {
        logs2.push(getEventInfo(controllerInstance.parseLog(log)))
    })
    return {
        deposit: logs1,
        withdraw: logs2,
    }
}

const getGroVaultTransferHistories = async function (account) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inGvtTransfer, EVENT_TYPE.outGvtTransfer],
        EVENT_FRAGMENT[EVENT_TYPE.gvtTransfer]
    )
    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(BN_BASE)
            .div(new BN(log.args[3].toString()))
    })
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
            .multipliedBy(BN_BASE)
            .div(new BN(log.args[3].toString()))
    })
    return logs
}

const getPowerDTransferHistories = async function (account) {
    const logs = await getTransferHistories(
        account,
        [EVENT_TYPE.inPwrdTransfer, EVENT_TYPE.outPwrdTransfer],
        EVENT_FRAGMENT[EVENT_TYPE.pwrdTransfer]
    )
    logs.deposit.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
    })
    logs.withdraw.forEach((log) => {
        log.amount = new BN(log.args[2].toString())
    })
    return logs
}

const getTransactionHistories = async function (account) {
    const groVault = await getGroVaultTransferHistories(account)
    const powerD = await getPowerDTransferHistories(account)

    const depositLogs = await getDepositHistories(account)
    const withdrawLogs = await getWithdrawHistories(account)

    groVault.deposit.push(...depositLogs.groVault)
    powerD.deposit.push(...depositLogs.powerD)

    groVault.withdraw.push(...withdrawLogs.groVault)
    powerD.withdraw.push(...withdrawLogs.powerD)
    return { groVault, powerD }
}

const generateReport = async function (account) {
    const datas = await getTransactionHistories(account)
    logger.info(`${account} historical: ${JSON.stringify(datas)}`)
    const result = {
        current_timestamp: Date.now() + '',
        launch_timestamp: launchTime,
        network: process.env.NODE_ENV,
        amount_added: {},
        amount_removed: {},
        net_amount_added: {},
        current_balance: {},
        net_returns: {},
        net_returns_ratio: {},
        address: account,
    }

    // calculate groVault deposit & withdraw
    let groVaultDepositAmount = new BN(0)
    let groVaultWithdrawAmount = new BN(0)
    datas.groVault.deposit.forEach((log) => {
        groVaultDepositAmount = groVaultDepositAmount.plus(log.amount)
    })
    datas.groVault.withdraw.forEach((log) => {
        groVaultWithdrawAmount = groVaultWithdrawAmount.plus(log.amount)
    })

    // calcuate powerd deposti & withdraw
    let powerDDepositAmount = new BN(0)
    let powerDWithdrawAmount = new BN(0)
    datas.powerD.deposit.forEach((log) => {
        powerDDepositAmount = powerDDepositAmount.plus(log.amount)
    })
    datas.powerD.withdraw.forEach((log) => {
        powerDWithdrawAmount = powerDWithdrawAmount.plus(log.amount)
    })
    // amount_added
    const depositAmount = powerDDepositAmount.plus(groVaultDepositAmount)
    result.amount_added.pwrd = powerDDepositAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.amount_added.gvt = groVaultDepositAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.amount_added.total = depositAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)

    // amount_removed
    const withdrawAmount = powerDWithdrawAmount.plus(groVaultWithdrawAmount)
    result.amount_removed.pwrd = powerDWithdrawAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.amount_removed.gvt = groVaultWithdrawAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.amount_removed.total = withdrawAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)

    // net_amount_added
    const netPwrdAmount = powerDDepositAmount.minus(powerDWithdrawAmount)
    const netGvtAmount = groVaultDepositAmount.minus(groVaultWithdrawAmount)
    const netTotal = depositAmount.minus(withdrawAmount)
    result.net_amount_added.pwrd = netPwrdAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.net_amount_added.gvt = netGvtAmount
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.net_amount_added.total = netTotal.div(BN_BASE).toFixed(amountDecimal)

    // current_balance
    const pwrdBalance = new BN(
        (await getPowerD().getAssets(account)).toString()
    )
    const gvtBalance = new BN(
        (await getGroVault().getAssets(account)).toString()
    )
    const totalBalance = pwrdBalance.plus(gvtBalance)
    result.current_balance.pwrd = pwrdBalance
        .div(BN_BASE)
        .toFixed(amountDecimal)
    result.current_balance.gvt = gvtBalance.div(BN_BASE).toFixed(amountDecimal)
    result.current_balance.total = totalBalance
        .div(BN_BASE)
        .toFixed(amountDecimal)

    // net_returns
    const pwrdReturn = pwrdBalance.minus(netPwrdAmount)
    const gvtReturn = gvtBalance.minus(netGvtAmount)
    const totalReturn = pwrdReturn.plus(gvtReturn)
    result.net_returns.pwrd = pwrdReturn.div(BN_BASE).toFixed(amountDecimal)
    result.net_returns.gvt = gvtReturn.div(BN_BASE).toFixed(amountDecimal)
    result.net_returns.total = totalReturn.div(BN_BASE).toFixed(amountDecimal)

    // net_returns_ratio
    const pwrdRatio = pwrdReturn.eq(new BN(0))
        ? new BN(0)
        : pwrdReturn.div(netPwrdAmount)
    const gvtRatio = gvtReturn.eq(new BN(0))
        ? new BN(0)
        : gvtReturn.div(netGvtAmount)
    const totalRatio = totalReturn.eq(new BN(0))
        ? new BN(0)
        : totalReturn.div(netTotal)
    result.net_returns_ratio.pwrd = pwrdRatio.toFixed(ratioDecimal)
    result.net_returns_ratio.gvt = gvtRatio.toFixed(ratioDecimal)
    result.net_returns_ratio.total = totalRatio.toFixed(ratioDecimal)

    return result
}

module.exports = {
    generateReport,
}
