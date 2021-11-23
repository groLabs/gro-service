"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryMessage = exports.withdrawEventMessage = exports.depositEventMessage = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const digitalUtil_1 = require("../common/digitalUtil");
const discordService_1 = require("../common/discord/discordService");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../${botEnv}/${botEnv}Logger`);
function depositEventMessage(content) {
    content.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${log.account}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nReferral: ${log.referral}\nUsdAmount: ${log.usdAmount}\nDAI: ${log.tokens[0]}\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const account = (0, digitalUtil_1.shortAccount)(log.account);
        const toAccount = log.gtoken === 'Vault' ? 'into Vault' : log.gtoken;
        (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.trades, {
            message: msg,
            type: discordService_1.MESSAGE_TYPES.depositEvent,
            emojis: [discordService_1.MESSAGE_EMOJI[log.gtoken]],
            description: `${account} **${log.action} $${(0, digitalUtil_1.formatNumber)(log.usdAmount, 18, 2)} ${toAccount}** (${(0, digitalUtil_1.formatNumber)(log.tokens[0], 18, 2)} DAI ${(0, digitalUtil_1.formatNumber)(log.tokens[1], 6, 2)} USDC ${(0, digitalUtil_1.formatNumber)(log.tokens[2], 6, 2)} USDT -> ${(0, digitalUtil_1.formatNumber)(log.gtokenAmount, 18, 2)} ${log.gtoken})`,
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
exports.depositEventMessage = depositEventMessage;
function withdrawEventMessage(content) {
    // Send withdraw message
    content.forEach((log) => {
        const msg = `\nGToken: ${log.gtoken}\nAccount: ${log.account}\nBlockNumer: ${log.blockNumber}\nTransactionHash: ${log.transactionHash}\nReferral: ${log.referral}\nBalanced: ${log.balanced}\nAll: ${log.all}\nWithdrawAmount: ${log.returnUsd}\nHOLD Bonus: ${new bignumber_js_1.default(log.deductUsd).minus(new bignumber_js_1.default(log.returnUsd))}\nLPAmount: ${log.lpAmount}\nDAI: ${log.tokens[0]}\nUSDC: ${log.tokens[1]}\nUSDT: ${log.tokens[2]}`;
        const account = (0, digitalUtil_1.shortAccount)(log.account);
        const toAccount = log.gtoken === 'Vault' ? 'from Vault' : log.gtoken;
        (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.trades, {
            message: msg,
            type: discordService_1.MESSAGE_TYPES.withdrawEvent,
            emojis: [discordService_1.MESSAGE_EMOJI[log.gtoken]],
            description: `${account} **${log.action} $${(0, digitalUtil_1.formatNumber)(log.returnUsd, 18, 2)} ${toAccount}** (${(0, digitalUtil_1.formatNumber)(log.gtokenAmount, 18, 2)} ${log.gtoken} -> ${(0, digitalUtil_1.formatNumber)(log.tokens[0], 18, 2)} DAI ${(0, digitalUtil_1.formatNumber)(log.tokens[1], 6, 2)} USDC ${(0, digitalUtil_1.formatNumber)(log.tokens[2], 6, 2)} USDT)`,
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
exports.withdrawEventMessage = withdrawEventMessage;
function displayTotalling(count, amount) {
    if (count === 0)
        return '';
    return `totaling **$${(0, digitalUtil_1.formatNumber)(amount, 18, 2)}**`;
}
function summaryMessage(content) {
    const { depositContent, withdrawContent, time } = content;
    // Send summary message
    const eventTotal = depositContent.gvt.count +
        depositContent.pwrd.count +
        withdrawContent.gvt.count +
        withdrawContent.pwrd.count;
    const msg = `${discordService_1.MESSAGE_EMOJI.company} **Gro Protocol Trade summary** for last hour (from ${time.start} To ${time.end} UTC):\n${discordService_1.MESSAGE_EMOJI[discordService_1.MESSAGE_TYPES.depositEvent]}${discordService_1.MESSAGE_EMOJI.Vault} Vault deposits - ${depositContent.gvt.count} ${depositContent.gvt.count === 1 ? 'trade' : 'trades'} ${displayTotalling(depositContent.gvt.count, depositContent.gvt.usdAmount)}\n${discordService_1.MESSAGE_EMOJI[discordService_1.MESSAGE_TYPES.withdrawEvent]}${discordService_1.MESSAGE_EMOJI.Vault} Vault withdrawals - ${withdrawContent.gvt.count} ${withdrawContent.gvt.count === 1 ? 'trade' : 'trades'} ${displayTotalling(withdrawContent.gvt.count, withdrawContent.gvt.returnUsd)}\n${discordService_1.MESSAGE_EMOJI[discordService_1.MESSAGE_TYPES.depositEvent]}${discordService_1.MESSAGE_EMOJI.PWRD} PWRD bought - ${depositContent.pwrd.count} ${depositContent.pwrd.count === 1 ? 'trade' : 'trades'} ${displayTotalling(depositContent.pwrd.count, depositContent.pwrd.usdAmount)}\n${discordService_1.MESSAGE_EMOJI[discordService_1.MESSAGE_TYPES.withdrawEvent]}${discordService_1.MESSAGE_EMOJI.PWRD} PWRD sold - ${withdrawContent.pwrd.count} ${withdrawContent.pwrd.count === 1 ? 'trade' : 'trades'} ${displayTotalling(withdrawContent.pwrd.count, withdrawContent.pwrd.returnUsd)}`;
    let embedDescription = '';
    if (eventTotal > 0) {
        embedDescription = msg;
    }
    const discordMsg = {
        type: discordService_1.MESSAGE_TYPES.stats,
        description: embedDescription,
        message: `\n${msg}`,
    };
    logger.info(discordMsg);
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.trades, discordMsg);
}
exports.summaryMessage = summaryMessage;
