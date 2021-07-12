const fs = require('fs');
const config = require('config');
const dayjs = require('dayjs');
const { BigNumber } = require('ethers');
const { getFilterEvents } = require('../../common/logFilter-new');
const { ContractCallError } = require('../../common/error');
const { MESSAGE_TYPES } = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const { formatNumber } = require('../../common/digitalUtil');
const { calculateDelta } = require('../../common/digitalUtil');
const {
    depositEventMessage,
    withdrawEventMessage,
    summaryMessage,
} = require('../../discordMessage/eventMessage');
const { AppendGTokenMintOrBurnAmountToLog } = require('../common/tool');
const { getLatestSystemContract } = require('../common/contractStorage');
const { ContractNames } = require('../../registry/registry');

const logger = require('../statsLogger');

let blockNumberFile = '../lastBlockNumber.json';

const providerKey = 'stats_gro';

if (config.has('blockNumberFile')) {
    blockNumberFile = config.get('blockNumberFile');
}

function getLastBlockNumber(type) {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    return blockObj[type] || getConfig('blockchain.start_block');
}

async function updateLastBlockNumber(blockNumber, type) {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    blockObj[type] = blockNumber + 1;
    fs.writeFileSync(blockNumberFile, JSON.stringify(blockObj));
}

async function generateDepositReport(fromBlock, toBlock) {
    // generate deposit filter
    const latestDepositHandler = getLatestSystemContract(
        ContractNames.depositHandler,
        providerKey
    );
    const depositFilter = latestDepositHandler.filters.LogNewDeposit();
    depositFilter.fromBlock = fromBlock;
    depositFilter.toBlock = toBlock;
    const logs = await getFilterEvents(
        depositFilter,
        latestDepositHandler.interface,
        providerKey
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get deposit events from block ${fromBlock} to ${toBlock} failed.`,
            MESSAGE_TYPES.depositEvent
        );
    });

    // handle gtoken mint amount
    await AppendGTokenMintOrBurnAmountToLog(logs);

    const result = [];
    const total = {
        gvt: {
            count: 0,
            usdAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
        pwrd: {
            count: 0,
            usdAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
    };
    logs.forEach((log) => {
        const item = {};
        if (log.args[2]) {
            item.gtoken = 'PWRD';
            item.action = 'bought';
            total.pwrd.count += 1;
            total.pwrd.usdAmount = total.pwrd.usdAmount.add(log.args[3]);
            total.pwrd.dai = total.pwrd.dai.add(log.args[4][0]);
            total.pwrd.usdc = total.pwrd.usdc.add(log.args[4][1]);
            total.pwrd.usdt = total.pwrd.usdt.add(log.args[4][2]);
        } else {
            item.gtoken = 'Vault';
            item.action = 'deposited';
            total.gvt.count += 1;
            total.gvt.usdAmount = total.gvt.usdAmount.add(log.args[3]);
            total.gvt.dai = total.gvt.dai.add(log.args[4][0]);
            total.gvt.usdc = total.gvt.usdc.add(log.args[4][1]);
            total.gvt.usdt = total.gvt.usdt.add(log.args[4][2]);
        }

        [item.account, item.referral] = log.args;
        item.blockNumber = log.blockNumber;
        item.transactionHash = log.transactionHash;
        item.usdAmount = log.args[3].toString();
        item.tokens = [
            log.args[4][0].toString(),
            log.args[4][1].toString(),
            log.args[4][2].toString(),
        ];
        item.gtokenAmount = log.gtokenAmount;
        result.push(item);
    });
    logger.info(
        `Deposit events from block ${fromBlock} to ${toBlock}:\n${JSON.stringify(
            result
        )}`
    );

    return { total, items: result };
}

async function generateWithdrawReport(fromBlock, toBlock) {
    // generate withdraw filter
    const latestWithdrawHandler = getLatestSystemContract(
        ContractNames.withdrawHandler,
        providerKey
    );
    const withdrawFilter = latestWithdrawHandler.filters.LogNewWithdrawal();
    withdrawFilter.fromBlock = fromBlock;
    withdrawFilter.toBlock = toBlock;
    const logs = await getFilterEvents(
        withdrawFilter,
        latestWithdrawHandler.interface,
        providerKey
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get withdraw events from block ${fromBlock} to ${toBlock} failed.`,
            MESSAGE_TYPES.withdrawEvent
        );
    });

    // parse burn gtoken amount
    await AppendGTokenMintOrBurnAmountToLog(logs);

    const result = [];
    const total = {
        gvt: {
            count: 0,
            deductUsd: BigNumber.from(0),
            returnUsd: BigNumber.from(0),
            lpAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
        pwrd: {
            count: 0,
            deductUsd: BigNumber.from(0),
            returnUsd: BigNumber.from(0),
            lpAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
    };
    logs.forEach((log) => {
        const item = {};
        if (log.args[2]) {
            item.gtoken = 'PWRD';
            item.action = 'sold';
            total.pwrd.count += 1;
            total.pwrd.deductUsd = total.pwrd.deductUsd.add(log.args[5]);
            total.pwrd.returnUsd = total.pwrd.returnUsd.add(log.args[6]);
            total.pwrd.lpAmount = total.pwrd.lpAmount.add(log.args[7]);
            total.pwrd.dai = total.pwrd.dai.add(log.args[8][0]);
            total.pwrd.usdc = total.pwrd.usdc.add(log.args[8][1]);
            total.pwrd.usdt = total.pwrd.usdt.add(log.args[8][2]);
        } else {
            item.gtoken = 'Vault';
            item.action = 'withdrew';
            total.gvt.count += 1;
            total.gvt.deductUsd = total.gvt.deductUsd.add(log.args[5]);
            total.gvt.returnUsd = total.gvt.returnUsd.add(log.args[6]);
            total.gvt.lpAmount = total.gvt.lpAmount.add(log.args[7]);
            total.gvt.dai = total.gvt.dai.add(log.args[8][0]);
            total.gvt.usdc = total.gvt.usdc.add(log.args[8][1]);
            total.gvt.usdt = total.gvt.usdt.add(log.args[8][2]);
        }
        [item.account, item.referral, , item.balanced, item.all] = log.args;
        item.blockNumber = log.blockNumber;
        item.transactionHash = log.transactionHash;
        item.deductUsd = log.args[5].toString();
        item.returnUsd = log.args[6].toString();
        item.lpAmount = log.args[7].toString();
        item.tokens = [
            log.args[8][0].toString(),
            log.args[8][1].toString(),
            log.args[8][2].toString(),
        ];
        item.gtokenAmount = log.gtokenAmount;
        result.push(item);
    });
    logger.info(
        `Withdraw events from block ${fromBlock} to ${toBlock}:\n${JSON.stringify(
            result
        )}`
    );

    return { total, items: result };
}

async function getGTokenAsset(gtoken, blockNumber) {
    const asset = await gtoken
        .totalAssets({ blockTag: blockNumber })
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Call totalAssets of token: ${gtoken.address} failed`
            );
        });
    const result = {
        originValue: asset,
        value: formatNumber(asset, 18, 2),
    };
    logger.info(`getGTokenAsset: ${JSON.stringify(result)}`);
    return result;
}

async function generateDepositAndWithdrawReport(fromBlock, toBlock) {
    logger.info(`Start to get event from block:${fromBlock} to ${toBlock}`);
    const depositEventResult = await generateDepositReport(fromBlock, toBlock);
    const withdrawEventResult = await generateWithdrawReport(
        fromBlock,
        toBlock
    );

    depositEventMessage(depositEventResult.items);

    withdrawEventMessage(withdrawEventResult.items);
}

function getTVLDelta(deposintTotalContent, withdrawTotalContent, currentTVL) {
    const vaultDeposits = deposintTotalContent.gvt;
    const pwrdDeposits = deposintTotalContent.pwrd;
    const vaultWithdraws = withdrawTotalContent.gvt;
    const pwrdWithdraws = withdrawTotalContent.pwrd;

    const vaultDiff = vaultDeposits.usdAmount.sub(vaultWithdraws.returnUsd);
    const pwrdDiff = pwrdDeposits.usdAmount.sub(pwrdWithdraws.returnUsd);
    logger.info(`vaultDiff: ${vaultDiff}`);
    logger.info(`pwrdDiff: ${pwrdDiff}`);
    const previousVault = vaultDiff.add(currentTVL.vault);
    const previousPwrd = pwrdDiff.add(currentTVL.pwrd);
    logger.info(`previousVault: ${previousVault}`);
    logger.info(`previousPwrd: ${previousPwrd}`);
    const vaultDelta = calculateDelta(vaultDiff, previousVault);
    const pwrdDelta = calculateDelta(pwrdDiff, previousPwrd);
    logger.info(`vaultDelta: ${vaultDelta}`);
    logger.info(`pwrdDelta: ${pwrdDelta}`);
    return { vaultDelta, pwrdDelta };
}

async function generateSummaryReport(fromBlock, toBlock) {
    logger.info(`Start to get event from block:${fromBlock} to ${toBlock}`);
    // handler display time
    const currentMillis = Date.now();
    const endTime = dayjs(currentMillis);
    const endTimeDisplay = endTime.format('H');
    const startTimeDisplay = endTimeDisplay - 1;

    const depositEventResult = await generateDepositReport(fromBlock, toBlock);
    const withdrawEventResult = await generateWithdrawReport(
        fromBlock,
        toBlock
    );
    const latestGvt = getLatestSystemContract(
        ContractNames.groVault,
        providerKey
    );
    const latestPWRD = getLatestSystemContract(
        ContractNames.powerD,
        providerKey
    );
    const { originValue: originVaultValue, value: vaultTVL } =
        await getGTokenAsset(latestGvt, toBlock);
    const { originValue: originPwrdValue, value: pwrdTVL } =
        await getGTokenAsset(latestPWRD, toBlock);
    const tvl = getTVLDelta(
        depositEventResult.total,
        withdrawEventResult.total,
        { vault: originVaultValue, pwrd: originPwrdValue }
    );
    const result = {
        tvl,
        depositContent: depositEventResult.total,
        withdrawContent: withdrawEventResult.total,
        systemAssets: {
            vaultTVL,
            pwrdTVL,
        },
        time: {
            start: `${startTimeDisplay}:00`,
            end: `${endTimeDisplay}:00`,
        },
    };
    logger.info(`result: ${JSON.stringify(result)}`);
    summaryMessage(result);
}

module.exports = {
    getLastBlockNumber,
    updateLastBlockNumber,
    generateDepositAndWithdrawReport,
    generateSummaryReport,
};
