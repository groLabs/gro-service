'use strict';

const {
    EVENT_TYPE,
    getEvents,
    getTransferEvents,
} = require('../../common/logFilter');
const { ContractCallError } = require('../../common/customErrors');
const {
    MESSAGE_TYPES,
    sendMessageToTradeChannel,
} = require('../../common/discord/discordService');
const { getConfig } = require('../../common/configUtil');
const { getPwrd } = require('../../contract/allContracts');
const fs = require('fs');
const config = require('config');
const BN = require('bignumber.js');
const logger = require('../regularLogger');
const { BigNumber } = require('ethers');
let blockNumberFile = '../lastBlockNumber.json';

if (config.has('blockNumberFile')) {
    blockNumberFile = config.get('blockNumberFile');
}

const getLastBlockNumber = function () {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length == 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    return blockObj.lastBlockNumber || getConfig('blockchain.start_block');
};

const updateLastBlockNumber = async function (blockNumber) {
    const content = { lastBlockNumber: blockNumber + 1 };
    fs.writeFileSync(blockNumberFile, JSON.stringify(content));
};

const generateDepositReport = async function (fromBlock, toBlock) {
    logger.info(
        `Start to get deposit event from block:${fromBlock} to ${toBlock}`
    );
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
    const pwrdAddress = getPwrd().address;
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
        if (log.args[2] == pwrdAddress) {
            item.gtoken = 'Pwrd';
            total.pwrd.usdAmount = total.pwrd.usdAmount.add(log.args[3]);
            total.pwrd.dai = total.pwrd.dai.add(log.args[4][0]);
            total.pwrd.usdc = total.pwrd.dai.add(log.args[4][1]);
            total.pwrd.usdt = total.pwrd.dai.add(log.args[4][2]);
        } else {
            item.gtoken = 'Gvt';
            total.gvt.usdAmount = total.gvt.usdAmount.add(log.args[3]);
            total.gvt.dai = total.gvt.dai.add(log.args[4][0]);
            total.gvt.usdc = total.gvt.dai.add(log.args[4][1]);
            total.gvt.usdt = total.gvt.dai.add(log.args[4][2]);
        }

        item.account = log.args[0];
        item.blockNumber = log.blockNumber;
        item.transactionHash = log.transactionHash;
        item.referral = log.args[1];
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

    logger.info(totalMsg);
    sendMessageToTradeChannel({
        message: totalMsg,
        type: MESSAGE_TYPES.depositEvent,
    });

    result.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${log.account}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nReferral: ${log.referral}\nUsdAmount: ${log.usdAmount}\nDAI: ${log.tokens[0]}\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.depositEvent,
        });
    });
};

const generateWithdrawReport = async function (fromBlock, toBlock) {
    logger.info(
        `Start to get withdraw event from block:${fromBlock} to ${toBlock}`
    );
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
            total.pwrd.usdc = total.pwrd.dai.add(log.args[8][1]);
            total.pwrd.usdt = total.pwrd.dai.add(log.args[8][2]);
        } else {
            item.gtoken = 'Gvt';
            total.gvt.deductUsd = total.gvt.deductUsd.add(log.args[5]);
            total.gvt.returnUsd = total.gvt.returnUsd.add(log.args[6]);
            total.gvt.lpAmount = total.gvt.lpAmount.add(log.args[7]);
            total.gvt.dai = total.gvt.dai.add(log.args[8][0]);
            total.gvt.usdc = total.gvt.dai.add(log.args[8][1]);
            total.gvt.usdt = total.gvt.dai.add(log.args[8][2]);
        }
        item.account = log.args[0];
        item.blockNumber = log.blockNumber;
        item.transactionHash = log.transactionHash;
        item.referral = log.args[1];
        item.balanced = log.args[3];
        item.all = log.args[4];
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

    logger.info(totalMsg);
    sendMessageToTradeChannel({
        message: totalMsg,
        type: MESSAGE_TYPES.withdrawEvent,
    });

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
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.withdrawEvent,
        });
    });
};

const generateGvtTransfer = async function (fromBlock, toBlock) {
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
        item.sender = log.args[0];
        item.recipient = log.args[1];
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
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.transferEvent,
        });
    });
};

const generatePwrdTransfer = async function (fromBlock, toBlock) {
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
        item.sender = log.args[0];
        item.recipient = log.args[1];
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
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.transferEvent,
        });
    });
};

module.exports = {
    getLastBlockNumber,
    generateDepositReport,
    generateWithdrawReport,
    generateGvtTransfer,
    generatePwrdTransfer,
    updateLastBlockNumber,
};
