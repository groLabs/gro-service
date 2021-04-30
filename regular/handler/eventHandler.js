const fs = require('fs');
const config = require('config');
const BN = require('bignumber.js');
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

const logger = require('../regularLogger');

let blockNumberFile = '../lastBlockNumber.json';

if (config.has('blockNumberFile')) {
    blockNumberFile = config.get('blockNumberFile');
}

function getLastBlockNumber() {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    return blockObj.lastBlockNumber || getConfig('blockchain.start_block');
}

async function updateLastBlockNumber(blockNumber) {
    const content = { lastBlockNumber: blockNumber + 1 };
    fs.writeFileSync(blockNumberFile, JSON.stringify(content));
}

async function generateDepositReport(fromBlock, toBlock) {
    logger.info(
        `Start to get deposit event from block:${fromBlock} to ${toBlock}`
    );
    const startBlock = await getDefaultProvider().getBlock(fromBlock);
    const endBlock = await getDefaultProvider().getBlock(toBlock);
    const startTime = dayjs.unix(startBlock.timestamp);
    const endTime = dayjs.unix(endBlock.timestamp);

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
            usdAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
        pwrd: {
            usdAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
    };
    logs.forEach((log) => {
        const item = {};
        if (log.args[2]) {
            item.gtoken = 'Pwrd';
            total.pwrd.usdAmount = total.pwrd.usdAmount.add(log.args[3]);
            total.pwrd.dai = total.pwrd.dai.add(log.args[4][0]);
            total.pwrd.usdc = total.pwrd.usdc.add(log.args[4][1]);
            total.pwrd.usdt = total.pwrd.usdt.add(log.args[4][2]);
        } else {
            item.gtoken = 'Gvt';
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
    // send report to discord
    const totalMsg = `\nBlock from ${fromBlock} to ${toBlock}\n===Gvt===\nUsdAmount: ${total.gvt.usdAmount}\nDAI: ${total.gvt.dai}\nUSDC: ${total.gvt.usdc}\nUSDT: ${total.gvt.usdt}\n===Pwrd===\nUsdAmount: ${total.pwrd.usdAmount}\nDAI: ${total.pwrd.dai}\nUSDC: ${total.pwrd.usdc}\nUSDT: ${total.pwrd.usdt}`;

    let embedDescription = '';
    if (total.gvt.usdAmount.add(total.pwrd.usdAmount).toString() !== '0') {
        embedDescription = `**From** ${startTime} **To** ${endTime} ${
            MESSAGE_EMOJI.Gvt
        } **${formatNumber(total.gvt.dai, 18, 2)}** DAI **${formatNumber(
            total.gvt.usdc,
            6,
            2
        )}** USDC **${formatNumber(total.gvt.usdt, 6, 2)}** USDT ${
            MESSAGE_EMOJI.Pwrd
        } **${formatNumber(total.pwrd.dai, 18, 2)}** DAI **${formatNumber(
            total.pwrd.usdc,
            6,
            2
        )}** USDC **${formatNumber(total.pwrd.usdt, 6, 2)}** USDT`;
    }
    const discordMsg = {
        type: MESSAGE_TYPES.depositEvent,
        description: embedDescription,
        message: totalMsg,
    };

    logger.info(discordMsg);
    sendMessageToTradeChannel(discordMsg);

    result.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${log.account}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nReferral: ${log.referral}\nUsdAmount: ${log.usdAmount}\nDAI: ${log.tokens[0]}\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const label = 'TX';
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.depositEvent,
            emojis: [MESSAGE_EMOJI[log.gtoken]],
            description: `${label} **${formatNumber(
                log.tokens[0],
                18,
                2
            )} DAI ${formatNumber(log.tokens[1], 6, 2)} USDC ${formatNumber(
                log.tokens[2],
                6,
                2
            )} USDT** supply by ${shortAccount(log.account)}`,
            urls: [
                {
                    label,
                    type: 'tx',
                    value: log.transactionHash,
                },
            ],
        });
    });
}

async function generateWithdrawReport(fromBlock, toBlock) {
    logger.info(
        `Start to get withdraw event from block:${fromBlock} to ${toBlock}`
    );
    const startBlock = await getDefaultProvider().getBlock(fromBlock);
    const endBlock = await getDefaultProvider().getBlock(toBlock);
    const startTime = dayjs.unix(startBlock.timestamp);
    const endTime = dayjs.unix(endBlock.timestamp);

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
            deductUsd: BigNumber.from(0),
            returnUsd: BigNumber.from(0),
            lpAmount: BigNumber.from(0),
            dai: BigNumber.from(0),
            usdc: BigNumber.from(0),
            usdt: BigNumber.from(0),
        },
        pwrd: {
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
            item.gtoken = 'Pwrd';
            total.pwrd.deductUsd = total.pwrd.deductUsd.add(log.args[5]);
            total.pwrd.returnUsd = total.pwrd.returnUsd.add(log.args[6]);
            total.pwrd.lpAmount = total.pwrd.lpAmount.add(log.args[7]);
            total.pwrd.dai = total.pwrd.dai.add(log.args[8][0]);
            total.pwrd.usdc = total.pwrd.usdc.add(log.args[8][1]);
            total.pwrd.usdt = total.pwrd.usdt.add(log.args[8][2]);
        } else {
            item.gtoken = 'Gvt';
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
    // send report to discord
    const totalMsg = `\nBlock from ${fromBlock} to ${toBlock}\n===Gvt===\nWithdrawAmount: ${
        total.gvt.returnUsd
    }\nHOLD Bonus: ${total.gvt.deductUsd.sub(total.gvt.returnUsd)}\nLPAmount: ${
        total.gvt.lpAmount
    }\nDAI: ${total.gvt.dai}\nUSDC: ${total.gvt.usdc}\nUSDT: ${
        total.gvt.usdt
    }\n===Pwrd===\nWithdrawAmount: ${
        total.pwrd.returnUsd
    }\nHOLD Bonus: ${total.pwrd.deductUsd.sub(
        total.pwrd.returnUsd
    )}\nLPAmount: ${total.pwrd.lpAmount}\nDAI: ${total.pwrd.dai}\nUSDC: ${
        total.pwrd.usdc
    }\nUSDT: ${total.pwrd.usdt}`;

    let embedDescription = '';
    if (total.gvt.lpAmount.add(total.pwrd.lpAmount).toString() !== '0') {
        embedDescription = `**From** ${startTime} **To** ${endTime} ${
            MESSAGE_EMOJI.Gvt
        } **${formatNumber(total.gvt.dai, 18, 2)}** DAI **${formatNumber(
            total.gvt.usdc,
            6,
            2
        )}** USDC **${formatNumber(total.gvt.usdt, 6, 2)}** USDT ${
            MESSAGE_EMOJI.Pwrd
        } **${formatNumber(total.pwrd.dai, 18, 2)}** DAI **${formatNumber(
            total.pwrd.usdc,
            6,
            2
        )}** USDC **${formatNumber(total.pwrd.usdt, 6, 2)}** USDT`;
    }

    const discordMsg = {
        type: MESSAGE_TYPES.withdrawEvent,
        description: embedDescription,
        message: totalMsg,
    };

    logger.info(discordMsg);
    sendMessageToTradeChannel(discordMsg);

    result.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${
            log.account
        }\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${
            log.transactionHash
        }\nReferral: ${log.referral}\nBalanced: ${log.balanced}\nAll: ${
            log.all
        }\nWithdrawAmount: ${log.returnUsd}\nHOLD Bonus: ${BN(
            log.deductUsd
        ).minus(BN(log.returnUsd))}\nLPAmount: ${log.lpAmount}\nDAI: ${
            log.tokens[0]
        }\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const label = 'TX';
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.withdrawEvent,
            emojis: [MESSAGE_EMOJI[log.gtoken]],
            description: `${label} **${formatNumber(
                log.tokens[0],
                18,
                2
            )} DAI ${formatNumber(log.tokens[1], 6, 2)} USDC ${formatNumber(
                log.tokens[2],
                6,
                2
            )} USDT** supply by ${shortAccount(log.account)}`,
            urls: [
                {
                    label,
                    type: 'tx',
                    value: log.transactionHash,
                },
            ],
        });
    });
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
    generateDepositReport,
    generateWithdrawReport,
    generateGvtTransfer,
    generatePwrdTransfer,
    updateLastBlockNumber,
};
