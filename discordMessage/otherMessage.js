const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessageToCriticalEventChannel,
} = require('../common/discord/discordService');
const { getConfig } = require('../common/configUtil');

const stabeCoinNames = getConfig('stable_coin', false) || [
    'DAI',
    'USDC',
    'USDT',
];
function updateChainlinkPriceMessage(content) {
    const { stableCoinAddress, stableCoinIndex } = content;
    const stableCoinName = stabeCoinNames[stableCoinIndex];
    const discordMessage = {
        message: `Update chainlink price for ${stableCoinName}: ${stableCoinAddress}`,
        type: MESSAGE_TYPES.chainPrice,
        description: `${MESSAGE_EMOJI.company} Update chainlink price for ${stableCoinName}`,
    };
    sendMessageToCriticalEventChannel(discordMessage);
}

module.exports = {
    updateChainlinkPriceMessage,
};
