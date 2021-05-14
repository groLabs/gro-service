const BN = require('bignumber.js');
const { shortAccount, div } = require('../common/digitalUtil');
const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendEmbedMessage,
    sendMessage,
} = require('../common/discord/discordService');

const ETH_DECIMAL = BN(10).pow(18);

function botBalanceMessage(content) {
    const accountLabel = shortAccount(content.botAccount);
    const balance = div(content.balance, ETH_DECIMAL, 4);
    const discordMessage = {
        icon: ':warning:',
        type: MESSAGE_TYPES[content.botType],
        emojis: [],
        message: `Bot:${content.botAccount}'s balance is ${balance}, need full up some balance`,
        description: `${MESSAGE_EMOJI[MESSAGE_TYPES[content.botType]]} **${
            content.botType
        }** ${accountLabel} only has **${balance}** ETH balance, please recharge more`,
        urls: [
            {
                label: accountLabel,
                type: 'account',
                value: content.botAccount,
            },
        ],
    };
    sendEmbedMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    sendMessage(DISCORD_CHANNELS.botAlerts, discordMessage);
}

module.exports = {
    botBalanceMessage,
};
