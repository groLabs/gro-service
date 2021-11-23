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
    const accountLabel = (0, digitalUtil_1.shortAccount)(content.botAccount);
    const balance = (0, digitalUtil_1.div)(content.balance, ETH_DECIMAL, 4);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES[content.botType],
        description: `${content.level} B6 - ${content.botType} ${accountLabel} only has ${balance} ETH, add more funds`,
        urls: [
            {
                label: accountLabel,
                type: 'account',
                value: content.botAccount,
            },
        ],
    };
    let pagerduty;
    if (content.level !== '[WARN]') {
        pagerduty = {
            title: `${content.level} B6 - Bot balance is too low`,
            description: `${content.level} B6 - ${content.botType} ${content.botAccount} only has ${balance} ETH, add more funds`,
            urgency: 'low',
        };
    }
    (0, alertMessageSender_1.sendAlertMessage)({
        pagerduty,
        discord: discordMessage,
    });
}
exports.botBalanceMessage = botBalanceMessage;
