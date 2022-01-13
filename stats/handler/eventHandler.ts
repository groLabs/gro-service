import fs from 'fs';
import config from 'config';
import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import { getFilterEvents } from '../../common/logFilter';
import { ContractCallError } from '../../common/error';
import { MESSAGE_TYPES } from '../../common/discord/discordService';
import { getConfig } from '../../common/configUtil';
import { formatNumber } from '../../common/digitalUtil';
import { sendAlertMessage } from '../../common/alertMessageSender';
import { calculateDelta } from '../../common/digitalUtil';
import {
    depositEventMessage,
    withdrawEventMessage,
    summaryMessage,
} from '../../discordMessage/eventMessage';
import { AppendGTokenMintOrBurnAmountToLog } from '../common/tool';
import { getLatestSystemContract } from '../common/contractStorage';
import { ContractNames } from '../../registry/registry';

const logger = require('../statsLogger');

let blockNumberFile = '../lastBlockNumber.json';

const providerKey = 'stats_gro';
const USD_DECIMAL = BigNumber.from(10).pow(BigNumber.from(18));

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

async function checkTvlChange(
    fromBlock,
    toBlock,
    depositEventResult,
    withdrawEventResult
) {
    try {
        const controller = getLatestSystemContract(
            ContractNames.controller,
            providerKey
        ).contract;
        const startTvl = await controller.totalAssets({
            blockTag: fromBlock - 1,
        });
        const endTvl = await controller.totalAssets({ blockTag: toBlock });
        const depositTotal = depositEventResult.total.pwrd.usdAmount.add(
            depositEventResult.total.gvt.usdAmount
        );
        const withdrawTotal = withdrawEventResult.total.pwrd.returnUsd.add(
            withdrawEventResult.total.gvt.returnUsd
        );

        const pnl = getLatestSystemContract(
            ContractNames.pnl,
            providerKey
        ).contract;

        const pnlFilter = pnl.filters.LogPnLExecution();
        pnlFilter.fromBlock = fromBlock;
        pnlFilter.toBlock = toBlock;
        const pnlLogs = await getFilterEvents(
            pnlFilter,
            pnl.interface,
            providerKey
        ).catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                `Get pnl events from block ${fromBlock} to ${toBlock} failed.`,
                MESSAGE_TYPES.other
            );
        });

        let totalHarvest = BigNumber.from(0);
        pnlLogs.data.forEach((log) => {
            const investPnL = log.args[2];
            totalHarvest = totalHarvest.add(investPnL);
            logger.info(
                `checkTotalAssets pnlLogs ${log.blockNumber} investPnL ${investPnL} totalHarvest ${totalHarvest}`
            );
        });
        const tvlDiff = endTvl.sub(startTvl);
        const totalDepositAndWithdraw = depositTotal.sub(withdrawTotal);
        const different = tvlDiff
            .sub(totalDepositAndWithdraw)
            .sub(totalHarvest);
        const differentRatio = different
            .mul(BigNumber.from(10000))
            .div(startTvl);
        const msg = `checkTotalAssets change fromBlock ${fromBlock} toBlock ${toBlock} startTvl ${startTvl.div(
            USD_DECIMAL
        )} endTvl ${endTvl.div(USD_DECIMAL)} depositTotal ${depositTotal.div(
            USD_DECIMAL
        )} withdrawTotal ${withdrawTotal.div(
            USD_DECIMAL
        )} tvlDiff ${tvlDiff.div(
            USD_DECIMAL
        )} totalDepositAndWithdraw ${totalDepositAndWithdraw.div(
            USD_DECIMAL
        )} totalHarvest ${totalHarvest.div(
            USD_DECIMAL
        )} \ndifferent = (tvlDiff - totalDepositAndWithdraw - totalHarvest) ${different.div(
            USD_DECIMAL
        )} differentRatio ${differentRatio}`;
        logger.info(msg);

        const emergencyThreshold = BigNumber.from(100);
        const criticalThreshold = BigNumber.from(50);
        const warningThreshold = BigNumber.from(25);
        const diff = differentRatio.abs();
        // const diff = BigNumber.from(109);
        const discordMessage = {
            message: msg,
            type: MESSAGE_TYPES.totalAssetsChange,
            description: '',
        };
        if (diff.gte(emergencyThreshold)) {
            discordMessage.description = `[EMERG] P1 - System’s asset change | Assets change from ${fromBlock} to ${toBlock} is ${diff} bp, threshold is ${emergencyThreshold} bp`;
            sendAlertMessage({
                discord: discordMessage,
                pagerduty: {
                    title: '[EMERG] P1 - System’s asset is abnormal',
                    description: discordMessage.description,
                    urgency: 'high',
                },
            });
        } else if (diff.gte(criticalThreshold)) {
            discordMessage.description = `[CRIT] P1 - System’s asset change | Assets change from ${fromBlock} to ${toBlock} is ${diff} bp, threshold is ${emergencyThreshold} bp`;
            sendAlertMessage({
                discord: discordMessage,
                pagerduty: {
                    title: '[CRIT] P1 - System’s asset is abnormal',
                    description: discordMessage.description,
                    urgency: 'low',
                },
            });
        } else if (diff.gte(warningThreshold)) {
            discordMessage.description = `[WARN] P1 - System’s asset change | Assets change from ${fromBlock} to ${toBlock} is ${diff} bp, threshold is ${warningThreshold} bp`;
            sendAlertMessage({ discord: discordMessage });
        }
        // sendMessageToChannel(DISCORD_CHANNELS.botLogs, discordMessage);
        logger.info(`totalAssets check ${discordMessage.description}`);
    } catch (e) {
        logger.error(e);
    }
}

async function generateDepositReport(fromBlock, toBlock) {
    // generate deposit filter
    const latestDepositHandler = getLatestSystemContract(
        ContractNames.depositHandler,
        providerKey
    ).contract;
    const depositFilter = latestDepositHandler.filters.LogNewDeposit();
    depositFilter.fromBlock = fromBlock;
    depositFilter.toBlock = toBlock;
    const logsObject = await getFilterEvents(
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
    const logs = logsObject.data;
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
        const item = {} as any;
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
    ).contract;
    const withdrawFilter = latestWithdrawHandler.filters.LogNewWithdrawal();
    withdrawFilter.fromBlock = fromBlock;
    withdrawFilter.toBlock = toBlock;
    const logsObject = await getFilterEvents(
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
    const logs = logsObject.data;
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
        const item = {} as any;
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
    await checkTvlChange(
        fromBlock,
        toBlock,
        depositEventResult,
        withdrawEventResult
    );
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
    const startTimeDisplay = (endTimeDisplay as any) - 1;

    const depositEventResult = await generateDepositReport(fromBlock, toBlock);
    const withdrawEventResult = await generateWithdrawReport(
        fromBlock,
        toBlock
    );
    const latestGvt = getLatestSystemContract(
        ContractNames.groVault,
        providerKey
    ).contract;
    const latestPWRD = getLatestSystemContract(
        ContractNames.powerD,
        providerKey
    ).contract;
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

    await new Promise((resolve) => setTimeout(resolve, 5000));
    summaryMessage(result);
}

export {
    getLastBlockNumber,
    updateLastBlockNumber,
    generateDepositAndWithdrawReport,
    generateSummaryReport,
};
