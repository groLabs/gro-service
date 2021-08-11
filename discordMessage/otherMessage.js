const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessageToChannel,
} = require('../common/discord/discordService');
const { getConfig } = require('../common/configUtil');
const { shortAccount } = require('../common/digitalUtil');

const stableCoinNames = getConfig('stable_coin', false) || [
    'DAI',
    'USDC',
    'USDT',
];

function updateChainlinkPriceMessage(content) {
    const { stableCoinAddress, stableCoinIndex } = content;
    const stableCoinName = stableCoinNames[stableCoinIndex];
    const discordMessage = {
        message: `Update chainlink price for ${stableCoinName}: ${stableCoinAddress}`,
        type: MESSAGE_TYPES.chainPrice,
        description: `${MESSAGE_EMOJI.company} Update chainlink price for ${stableCoinName}`,
    };
    sendMessageToChannel(DISCORD_CHANNELS.critActionEvents, discordMessage);
}

function updatePriceTransactionMessage(content) {
    if (content.length === 0) return;
    const { type, msgLabel, hash, transactionReceipt } = content[0];
    const typeItems = type.split('-');
    let action = typeItems[0];
    action = action.replace(action[0], action[0].toUpperCase());
    const label = shortAccount(hash);
    const discordMessage = {
        type: msgLabel,
        message: `${type} transaction ${hash} has mined to chain`,
        description: `${MESSAGE_EMOJI.company} ${label} ${action} action confirmed to chain`,
        urls: [
            {
                label,
                type: 'tx',
                value: hash,
            },
        ],
    };
    if (!transactionReceipt) {
        discordMessage.message = `${type} transaction: ${hash} is still pending.`;
        discordMessage.description = undefined;
    } else if (!transactionReceipt.status) {
        discordMessage.message = `${type} transaction ${hash} reverted.`;
        discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${action} action is reverted`;
    }

    sendMessageToChannel(DISCORD_CHANNELS.critActionEvents, discordMessage);
}

function safetyCheckMessage() {
    const discordMessage = {
        message: 'Price safety check is false, please check it.',
        type: MESSAGE_TYPES.other,
        description: `${MESSAGE_EMOJI.company} Price safety check is false, please check it.`,
    };
    sendMessageToChannel(DISCORD_CHANNELS.botAlerts, discordMessage);
}

module.exports = {
    updateChainlinkPriceMessage,
    updatePriceTransactionMessage,
    safetyCheckMessage,
};
