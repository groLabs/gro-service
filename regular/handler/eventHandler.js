const fs = require('fs');
const config = require('config');
const dayjs = require('dayjs');
const { BigNumber } = require('ethers');
const {
    EVENT_TYPE,
    getEvents,
    getTransferEvents,
} = require('../../common/logFilter');
const { ContractCallError } = require('../../common/error');
const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessageToTradeChannel,
} = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const { getDefaultProvider } = require('../../common/chainUtil');
const { formatNumber, shortAccount } = require('../../common/digitalUtil');
const { getGvt, getPwrd } = require('../../contract/allContracts');
const { calculateDelta } = require('../../common/digitalUtil');

const {
    depositEventMessage,
    withdrawEventMessage,
    summaryMessage,
} = require('../../discordMessage/eventMessage');

const logger = require('../regularLogger');

let blockNumberFile = '../lastBlockNumber.json';

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
    const logs = await getEvents(EVENT_TYPE.deposit, fromBlock, toBlock).catch(
        (error) => {
            logger.error(error);
            throw new ContractCallError(
                `Get deposit events from block ${fromBlock} to ${toBlock} failed.`,
                MESSAGE_TYPES.depositEvent
            );
        }
    );
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
    const logs = await getEvents(EVENT_TYPE.withdraw, fromBlock, toBlock).catch(
        (error) => {
            logger.error(error);
            throw new ContractCallError(
                `Get withdraw events from block ${fromBlock} to ${toBlock} failed.`,
                MESSAGE_TYPES.withdrawEvent
            );
        }
    );
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
    const startBlock = await getDefaultProvider().getBlock(fromBlock);
    const endBlock = await getDefaultProvider().getBlock(toBlock);
    const startTime = dayjs.unix(startBlock.timestamp);
    let startTimeDisplay = startTime.format('h');
    const endTime = dayjs.unix(endBlock.timestamp);
    const endTimeDisplay = endTime.format('h');
    const flag = endTime.format('a');

    if (startTimeDisplay === endTimeDisplay) {
        startTimeDisplay = endTimeDisplay - 1;
    }

    const depositEventResult = await generateDepositReport(fromBlock, toBlock);
    const withdrawEventResult = await generateWithdrawReport(
        fromBlock,
        toBlock
    );
    const {
        originValue: originVaultValue,
        value: vaultTVL,
    } = await getGTokenAsset(getGvt(), toBlock);
    const {
        originValue: originPwrdValue,
        value: pwrdTVL,
    } = await getGTokenAsset(getPwrd(), toBlock);
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
            start: `${startTimeDisplay}${flag}`,
            end: `${endTimeDisplay}${flag}`,
        },
    };
    logger.info(`result: ${JSON.stringify(result)}`);
    summaryMessage(result);
}

async function generateGvtTransfer(fromBlock, toBlock) {
    logger.info(
        `Start to get Gvt transfer event from block:${fromBlock} to ${toBlock}`
    );
    const logs = await getTransferEvents(
        EVENT_TYPE.gvtTransfer,
        fromBlock,
        toBlock
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get Gvt events transfer event from block ${fromBlock} to ${toBlock} failed.`,
            MESSAGE_TYPES.transferEvent
        );
    });

    const result = [];
    logs.forEach((log) => {
        const item = {};
        item.blockNumber = log.blockNumber;
        item.transactionHash = log.transactionHash;
        item.gToken = 'Gvt';
        [item.sender, item.recipient] = log.args;
        item.amount = log.args[2].toString();
        item.factor = log.args[3].toString();
        result.push(item);
    });
    logger.info(
        `Gvt transfer events from block ${fromBlock} to ${toBlock}:\n${JSON.stringify(
            result
        )}`
    );

    // send report to discord
    result.forEach((log) => {
        const msg = `\nGToken: ${log.gToken}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nSender: ${log.sender}\nRecipient: ${log.recipient}\nAmount: ${log.amount}\nFactor: ${log.factor}`;
        const label = 'TX';
        const sender = shortAccount(log.sender);
        const recipient = shortAccount(log.recipient);
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.transferEvent,
            emojis: [MESSAGE_EMOJI[log.gToken]],
            description: `${label} ${sender} transfer **${formatNumber(
                log.amount,
                18,
                2
            )}** to ${recipient}`,
            urls: [
                {
                    label,
                    type: 'tx',
                    value: log.transactionHash,
                },
                {
                    sender,
                    type: 'account',
                    value: log.sender,
                },
                {
                    recipient,
                    type: 'account',
                    value: log.recipient,
                },
            ],
        });
    });
}

async function generatePwrdTransfer(fromBlock, toBlock) {
    logger.info(
        `Start to get Pwrd transfer event from block:${fromBlock} to ${toBlock}`
    );
    const logs = await getTransferEvents(
        EVENT_TYPE.pwrdTransfer,
        fromBlock,
        toBlock
    ).catch((error) => {
        logger.error(error);
        throw new ContractCallError(
            `Get Pwrd events transfer event from block ${fromBlock} to ${toBlock} failed.`,
            MESSAGE_TYPES.transferEvent
        );
    });

    const result = [];
    logs.forEach((log) => {
        const item = {};
        item.blockNumber = log.blockNumber;
        item.transactionHash = log.transactionHash;
        item.gToken = 'Pwrd';
        [item.sender, item.recipient] = log.args;
        item.amount = log.args[2].toString();
        result.push(item);
    });
    logger.info(
        `Pwrd transfer events from block ${fromBlock} to ${toBlock}:\n${JSON.stringify(
            result
        )}`
    );

    // send report to discord
    result.forEach((log) => {
        const msg = `\nGToken: ${log.gToken}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nSender: ${log.sender}\nRecipient: ${log.recipient}\nAmount: ${log.amount}`;
        const label = 'TX';
        const sender = shortAccount(log.sender);
        const recipient = shortAccount(log.recipient);
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.transferEvent,
            emojis: [MESSAGE_EMOJI[log.gToken]],
            description: `${label} ${sender} transfer **${formatNumber(
                log.amount,
                18,
                2
            )}** to ${recipient}`,
            urls: [
                {
                    label,
                    type: 'tx',
                    value: log.transactionHash,
                },
                {
                    sender,
                    type: 'account',
                    value: log.sender,
                },
                {
                    recipient,
                    type: 'account',
                    value: log.recipient,
                },
            ],
        });
    });
}

module.exports = {
    getLastBlockNumber,
    generateGvtTransfer,
    generatePwrdTransfer,
    updateLastBlockNumber,
    generateDepositAndWithdrawReport,
    generateSummaryReport,
};
