import BN from 'bignumber.js';
import { formatNumber, shortAccount } from '../common/digitalUtil';
import { MESSAGE_TYPES, MESSAGE_EMOJI, DISCORD_CHANNELS, sendMessageToChannel } from '../common/discord/discordService';

const botEnv = process.env.BOT_ENV?.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../${botEnv}/${botEnv}Logger`);

function depositEventMessage(content, stats) {
    content.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${log.account}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nReferral: ${log.referral}\nUsdAmount: ${log.usdAmount}\nDAI: ${log.tokens[0]}\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const account = shortAccount(log.account);
        const toAccount = log.gtoken === 'Vault' ? 'into Vault' : log.gtoken;
        sendMessageToChannel(DISCORD_CHANNELS.trades, {
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
            )} USDT -> ${formatNumber(log.gtokenAmount, 18, 2)} ${
                log.gtoken
            })\n${MESSAGE_EMOJI.Vault} **$${stats.gvtTvl}**mn TVL, **${
                stats.gvtApy
            }%** APY\n${MESSAGE_EMOJI.PWRD} **$${stats.pwrdTvl}**mn TVL, **${
                stats.pwrdApy
            }%** APY\n${MESSAGE_EMOJI.company} **$${
                stats.totalTvl
            }**mn TVL, **${stats.utilRatio}%** Utilization\n`,
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

function withdrawEventMessage(content, stats) {
    // Send withdraw message
    content.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${
            log.account
        }\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${
            log.transactionHash
        }\nReferral: ${log.referral}\nBalanced: ${log.balanced}\nAll: ${
            log.all
        }\nWithdrawAmount: ${log.returnUsd}\nHOLD Bonus: ${new BN(
            log.deductUsd
        ).minus(new BN(log.returnUsd))}\nLPAmount: ${log.lpAmount}\nDAI: ${
            log.tokens[0]
        }\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const account = shortAccount(log.account);
        const toAccount = log.gtoken === 'Vault' ? 'from Vault' : log.gtoken;
        sendMessageToChannel(DISCORD_CHANNELS.trades, {
            message: msg,
            type: MESSAGE_TYPES.withdrawEvent,
            emojis: [MESSAGE_EMOJI[log.gtoken]],
            description: `${account} **${log.action} $${formatNumber(
                log.returnUsd,
                18,
                2
            )} ${toAccount}** (${formatNumber(log.gtokenAmount, 18, 2)} ${
                log.gtoken
            } -> ${formatNumber(log.tokens[0], 18, 2)} DAI ${formatNumber(
                log.tokens[1],
                6,
                2
            )} USDC ${formatNumber(log.tokens[2], 6, 2)} USDT)\n${
                MESSAGE_EMOJI.Vault
            } **$${stats.gvtTvl}**mn TVL, **${stats.gvtApy}%** APY\n${
                MESSAGE_EMOJI.PWRD
            } **$${stats.pwrdTvl}**mn TVL, **${stats.pwrdApy}%** APY\n${
                MESSAGE_EMOJI.company
            } **$${stats.totalTvl}**mn TVL, **${
                stats.utilRatio
            }%** Utilization\n`,
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
    sendMessageToChannel(DISCORD_CHANNELS.trades, discordMsg);
}

export {
    depositEventMessage,
    withdrawEventMessage,
    summaryMessage,
};
