"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendErrorMessageToLogChannel = exports.sendMessageToAlertChannel = exports.sendMessageToChannel = exports.sendEmbedMessage = exports.sendMessage = exports.MESSAGE_EMOJI = exports.MESSAGE_TYPES = exports.DISCORD_CHANNELS = void 0;
const configUtil_1 = require("../configUtil");
const discord_1 = require("./discord");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
/* eslint-disable import/no-dynamic-require */
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const RETRY_TIMES = (0, configUtil_1.getConfig)('discord.retry', false) || 2;
const RESEND_DELAY_SETTING = (0, configUtil_1.getConfig)('discord.resend_delay', false) || 2000;
const DISCORD_CHANNELS = {};
exports.DISCORD_CHANNELS = DISCORD_CHANNELS;
DISCORD_CHANNELS.trades = (0, configUtil_1.getConfig)('discord.channel.trades');
DISCORD_CHANNELS.protocolAssets = (0, configUtil_1.getConfig)('discord.channel.protocol_assets');
DISCORD_CHANNELS.protocolEvents = (0, configUtil_1.getConfig)('discord.channel.protocol_events');
DISCORD_CHANNELS.critActionEvents = (0, configUtil_1.getConfig)('discord.channel.crit_action_events');
DISCORD_CHANNELS.botAlerts = (0, configUtil_1.getConfig)('discord.channel.bot_alerts');
DISCORD_CHANNELS.botLogs = (0, configUtil_1.getConfig)('discord.channel.bot_logs');
const MESSAGE_TYPES = {
    depositEvent: 'Deposit Event',
    withdrawEvent: 'Withdraw Event',
    transferEvent: 'Transfer',
    miniStatsPersonal: 'Personal Stats',
    adjustNonce: 'Adjust Nonce',
    investTrigger: 'Invest Trigger',
    curveInvestTrigger: 'Curve Invest Trigger',
    invest: 'Invest',
    curveInvest: 'Curve Invest',
    harvestTrigger: 'Harvest Trigger',
    harvest: 'Harvest',
    pnlTrigger: 'Pnl Trigger',
    pnl: 'Pnl',
    rebalanceTrigger: 'Rebalance Trigger',
    rebalance: 'Rebalance',
    topup: 'Topup',
    curveCheck: 'Curve Check',
    strategyCheck: 'Strategy Price Check',
    stats: 'Generate Stats',
    regularBot: 'Harvest Bot',
    statsBot: 'Stats Bot',
    criticalBot: 'Critical Bot',
    chainPrice: 'Update Chain Price',
    totalAssetsChange: 'Total Assets Change',
    strategyAssets: 'Strategy Assets',
    distributeCurveVault: 'Distribute Curve Vault',
    other: 'Others',
};
exports.MESSAGE_TYPES = MESSAGE_TYPES;
const MESSAGE_EMOJI = {};
exports.MESSAGE_EMOJI = MESSAGE_EMOJI;
MESSAGE_EMOJI.Vault =
    (0, configUtil_1.getConfig)('emoji.gvt', false) || '<:Vault:834796096797802507>';
MESSAGE_EMOJI.PWRD =
    (0, configUtil_1.getConfig)('emoji.pwrd', false) || '<:PWRD:834796096915767306>';
MESSAGE_EMOJI.error = (0, configUtil_1.getConfig)('emoji.error', false) || '';
MESSAGE_EMOJI.company =
    (0, configUtil_1.getConfig)('emoji.company', false) || '<:GRO:834796096685211689>';
MESSAGE_EMOJI.reverted = (0, configUtil_1.getConfig)('emoji.reverted', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.miniStatsPersonal] =
    (0, configUtil_1.getConfig)('emoji.miniStatsPersonal', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.stats] = (0, configUtil_1.getConfig)('emoji.stats', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.depositEvent] =
    (0, configUtil_1.getConfig)('emoji.depositEvent', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.withdrawEvent] =
    (0, configUtil_1.getConfig)('emoji.withdrawEvent', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.transferEvent] =
    (0, configUtil_1.getConfig)('emoji.transferEvent', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.investTrigger] =
    (0, configUtil_1.getConfig)('emoji.investTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.curveInvestTrigger] =
    (0, configUtil_1.getConfig)('emoji.curveInvestTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.invest] = (0, configUtil_1.getConfig)('emoji.invest', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.curveInvest] =
    (0, configUtil_1.getConfig)('emoji.curveInvest', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.harvestTrigger] =
    (0, configUtil_1.getConfig)('emoji.harvestTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.harvest] = (0, configUtil_1.getConfig)('emoji.harvest', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.pnlTrigger] =
    (0, configUtil_1.getConfig)('emoji.pnlTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.pnl] = (0, configUtil_1.getConfig)('emoji.pnl', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.rebalanceTrigger] =
    (0, configUtil_1.getConfig)('emoji.rebalanceTrigger', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.rebalance] =
    (0, configUtil_1.getConfig)('emoji.rebalance', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.curveCheck] =
    (0, configUtil_1.getConfig)('emoji.curveCheck', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.regularBot] =
    (0, configUtil_1.getConfig)('emoji.regularBot', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.statsBot] =
    (0, configUtil_1.getConfig)('emoji.statsBot', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.criticalBot] =
    (0, configUtil_1.getConfig)('emoji.criticalBot', false) || '';
MESSAGE_EMOJI[MESSAGE_TYPES.chainPrice] =
    (0, configUtil_1.getConfig)('emoji.curveCheck', false) || '';
function generateLink(urlDetail) {
    var _a;
    const nodeEnv = (_a = process.env.NODE_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    let host = `https://${nodeEnv}.etherscan.io`;
    if (nodeEnv === 'mainnet') {
        host = 'https://etherscan.io';
    }
    let url = '';
    switch (urlDetail.type) {
        case 'account':
            url = `${host}/address/${urlDetail.value}`;
            break;
        case 'tx':
            url = `${host}/tx/${urlDetail.value}`;
            break;
        default:
            logger.warn(`Not fund url type: ${urlDetail.type}`);
    }
    return url;
}
function generateEmbedMessage(obj) {
    logger.info(`embed msg: ${JSON.stringify(obj)}`);
    const prefixEmojis = obj.emojis.join(' ');
    if (obj.urls) {
        for (let i = 0; i < obj.urls.length; i += 1) {
            const urlInfo = obj.urls[i];
            const { label } = urlInfo;
            const link = `[${label}](${generateLink(urlInfo)})`;
            obj.description = obj.description.replace(label, link);
        }
    }
    return { description: `${prefixEmojis} ${obj.description}` };
}
function formatMessage(obj) {
    let msg = '';
    msg += `Message: ${obj.message}\n`;
    msg += `Date: ${obj.timestamp}\n`;
    if (obj.params) {
        msg += `Params: ${JSON.stringify(obj.params)}\n`;
    }
    if (obj.result) {
        msg += `Result: ${JSON.stringify(obj.result)}\n`;
    }
    if (obj.transactionHash) {
        msg += `Transaction: ${obj.transactionHash}`;
    }
    const icon = obj.icon || '';
    return `${icon}**${obj.type || 'Others'}**\n${'```'}${msg}${'```'}`;
}
async function sendEmbedMessage(channelId, msgObj, retry = 0) {
    if (!msgObj.description)
        return;
    if (retry > RETRY_TIMES) {
        logger.info(`Discord message retry: ${retry} channel:${channelId}; msg: ${JSON.stringify(msgObj)}`);
        return;
    }
    try {
        const discordClient = (0, discord_1.getDiscordClient)();
        const channel = await discordClient.channels.fetch(channelId);
        channel.send({ embed: generateEmbedMessage(msgObj) });
    }
    catch (error) {
        logger.error(error);
        setTimeout(sendEmbedMessage, RESEND_DELAY_SETTING, channelId, msgObj, retry + 1);
    }
}
exports.sendEmbedMessage = sendEmbedMessage;
async function sendMessage(channelId, msgObj, retry = 0) {
    if (!msgObj.message)
        return;
    if (retry > RETRY_TIMES) {
        logger.info(`Discord message retry: ${retry} channel:${channelId}; msg: ${JSON.stringify(msgObj)}`);
        return;
    }
    if (!msgObj.timestamp)
        msgObj.timestamp = new Date();
    try {
        const discordClient = (0, discord_1.getDiscordClient)();
        const channel = await discordClient.channels.fetch(channelId);
        channel.send(formatMessage(msgObj));
    }
    catch (error) {
        logger.error(error);
        setTimeout(sendMessage, RESEND_DELAY_SETTING, channelId, msgObj, retry + 1);
    }
}
exports.sendMessage = sendMessage;
function sendMessageToChannel(channel, msgObj) {
    if (!msgObj.emojis) {
        msgObj.emojis = [];
    }
    if (channel !== DISCORD_CHANNELS.botAlerts) {
        msgObj.emojis.unshift(MESSAGE_EMOJI[msgObj.type]);
    }
    sendEmbedMessage(channel, msgObj);
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}
exports.sendMessageToChannel = sendMessageToChannel;
function sendMessageToAlertChannel(error) {
    logger.error(error);
    const msgObj = {
        icon: ':warning:',
        message: error.message,
        type: error.messageTag,
        description: error.embedMessage,
        emojis: [MESSAGE_EMOJI.error],
        transactionHash: error.transactionHash,
    };
    sendEmbedMessage(DISCORD_CHANNELS.botLogs, msgObj);
    sendMessage(DISCORD_CHANNELS.botAlerts, msgObj);
}
exports.sendMessageToAlertChannel = sendMessageToAlertChannel;
function sendErrorMessageToLogChannel(error) {
    logger.error(error);
    const msgObj = {
        icon: ':warning:',
        message: error.message,
        type: error.messageTag,
        description: error.embedMessage,
        emojis: [MESSAGE_EMOJI.error],
        transactionHash: error.transactionHash,
    };
    sendMessage(DISCORD_CHANNELS.botLogs, msgObj);
}
exports.sendErrorMessageToLogChannel = sendErrorMessageToLogChannel;
