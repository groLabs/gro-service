"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botBalanceMessage = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const digitalUtil_1 = require("../common/digitalUtil");
const discordService_1 = require("../common/discord/discordService");
const alertMessageSender_1 = require("../common/alertMessageSender");
const ETH_DECIMAL = new bignumber_js_1.default(10).pow(18);
function botBalanceMessage(content) {
    const { botAccount, botType, chain, walletKey, balance, level } = content;
    const accountLabel = (0, digitalUtil_1.shortAccount)(botAccount);
    const distBalance = (0, digitalUtil_1.div)(balance, ETH_DECIMAL, 4);
    let chainLabel = '[Ethereum]';
    let tokenLabal = 'ETH';
    if (chain && chain.toLowerCase() === 'avax') {
        chainLabel = '[Avalanche]';
        tokenLabal = 'AVAX';
    }
    let botLabel = botType;
    if (walletKey) {
        botLabel = `${botLabel} - ${walletKey}`;
    }
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES[botType],
        description: `${level}${chainLabel} B6 - ${botLabel} ${accountLabel} only has ${distBalance} ${tokenLabal}, add more funds`,
        urls: [
            {
                label: accountLabel,
                type: 'account',
                value: botAccount,
            },
        ],
    };
    let pagerduty;
    if (level !== '[WARN]') {
        pagerduty = {
            title: `${level} B6 - Bot balance is too low`,
            description: `${level}${chainLabel} B6 - ${botLabel} ${accountLabel} only has ${distBalance} ${tokenLabal}, add more funds`,
            urgency: 'low',
        };
    }
    (0, alertMessageSender_1.sendAlertMessage)({
        pagerduty,
        discord: discordMessage,
    });
}
exports.botBalanceMessage = botBalanceMessage;
