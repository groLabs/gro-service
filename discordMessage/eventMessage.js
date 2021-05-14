const BN = require('bignumber.js');
const { formatNumber, shortAccount } = require('../common/digitalUtil');
const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessageToTradeChannel,
} = require('../common/discord/discordService');

const botEnv = process.env.BOT_ENV.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../${botEnv}/${botEnv}Logger`);

function depositEventMessage(content) {
    content.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${log.account}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nReferral: ${log.referral}\nUsdAmount: ${log.usdAmount}\nDAI: ${log.tokens[0]}\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const account = shortAccount(log.account);
        const toAccount = log.gtoken === 'Vault' ? 'into Vault' : log.gtoken;
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.depositEvent,
            emojis: [MESSAGE_EMOJI[log.gtoken]],
            description: `${account} **${log.action} $${formatNumber(
                log.usdAmount,
                18,
                2
            )} ${toAccount}** (${formatNumber(
                log.tokens[0],
                18,
                2
            )} DAI ${formatNumber(log.tokens[1], 6, 2)} USDC ${formatNumber(
                log.tokens[2],
                6,
                2
            )} USDT)`,
            urls: [
                {
                    label: account,
                    type: 'tx',
                    value: log.transactionHash,
                },
            ],
        });
    });
}

function withdrawEventMessage(content) {
    // Send withdraw message
    content.forEach((log) => {
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
        const account = shortAccount(log.account);
        const toAccount = log.gtoken === 'Vault' ? 'from Vault' : log.gtoken;
        sendMessageToTradeChannel({
            message: msg,
            type: MESSAGE_TYPES.withdrawEvent,
            emojis: [MESSAGE_EMOJI[log.gtoken]],
            description: `${account} **${log.action} $${formatNumber(
                log.returnUsd,
                18,
                2
            )} ${toAccount}** (${formatNumber(
                log.tokens[0],
                18,
                2
            )} DAI ${formatNumber(log.tokens[1], 6, 2)} USDC ${formatNumber(
                log.tokens[2],
                6,
                2
            )} USDT)`,
            urls: [
                {
                    label: account,
                    type: 'account',
                    value: log.account,
                },
            ],
        });
    });
}

function displayTotalling(count, amount) {
    if (count === 0) return '';
    return `totaling **$${formatNumber(amount, 18, 2)}**`;
}
function summaryMessage(content) {
    const { depositContent, withdrawContent, time } = content;
    // Send summary message
    const eventTotal =
        depositContent.gvt.count +
        depositContent.pwrd.count +
        withdrawContent.gvt.count +
        withdrawContent.pwrd.count;
    const msg = `${
        MESSAGE_EMOJI.company
    } **Gro Protocol Trade summary** for last hour (from ${time.start} To ${
        time.end
    } UTC):\n${MESSAGE_EMOJI[MESSAGE_TYPES.depositEvent]}${
        MESSAGE_EMOJI.Vault
    } Vault deposits - ${depositContent.gvt.count} ${
        depositContent.gvt.count === 1 ? 'trade' : 'trades'
    } ${displayTotalling(
        depositContent.gvt.count,
        depositContent.gvt.usdAmount
    )}\n${MESSAGE_EMOJI[MESSAGE_TYPES.withdrawEvent]}${
        MESSAGE_EMOJI.Vault
    } Vault withdrawals - ${withdrawContent.gvt.count} ${
        withdrawContent.gvt.count === 1 ? 'trade' : 'trades'
    } ${displayTotalling(
        withdrawContent.gvt.count,
        withdrawContent.gvt.returnUsd
    )}\n${MESSAGE_EMOJI[MESSAGE_TYPES.depositEvent]}${
        MESSAGE_EMOJI.PWRD
    } PWRD bought - ${depositContent.pwrd.count} ${
        depositContent.pwrd.count === 1 ? 'trade' : 'trades'
    } ${displayTotalling(
        depositContent.pwrd.count,
        depositContent.pwrd.usdAmount
    )}\n${MESSAGE_EMOJI[MESSAGE_TYPES.withdrawEvent]}${
        MESSAGE_EMOJI.PWRD
    } PWRD sold - ${withdrawContent.pwrd.count} ${
        withdrawContent.pwrd.count === 1 ? 'trade' : 'trades'
    } ${displayTotalling(
        withdrawContent.pwrd.count,
        withdrawContent.pwrd.returnUsd
    )}`;
    let embedDescription = '';
    if (eventTotal > 0) {
        embedDescription = msg;
    }
    const discordMsg = {
        type: MESSAGE_TYPES.stats,
        description: embedDescription,
        message: `\n${msg}`,
    };

    logger.info(discordMsg);
    sendMessageToTradeChannel(discordMsg);
}

module.exports = {
    depositEventMessage,
    withdrawEventMessage,
    summaryMessage,
};
