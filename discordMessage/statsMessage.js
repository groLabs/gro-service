const { shortAccount } = require('../common/digitalUtil');
const {
    MESSAGE_TYPES,
    sendMessageToLogChannel,
    sendMessageToProtocolAssetChannel,
} = require('../common/discord/discordService');
const { formatNumber } = require('../common/digitalUtil');

function personalStatsMessage(content) {
    const label = shortAccount(content.address);
    const discordMsg = {
        type: MESSAGE_TYPES.miniStatsPersonal,
        description: `${label} loaded their personal data`,
        urls: [
            {
                label,
                type: 'account',
                value: content.address,
            },
        ],
    };
    sendMessageToLogChannel(discordMsg);
}

function apyStatsMessage(content) {
    const { vaultTVL, pwrdTVL, total } = content;
    const discordMsg = {
        type: MESSAGE_TYPES.stats,
        message: `PWRD Dollar:${pwrdTVL}\nVault Dollar:${vaultTVL}\nTotalAssets:${total}`,
        description: `Vault TVL: **$${formatNumber(
            vaultTVL,
            0,
            4
        )}** PWRD TVL: **$${formatNumber(
            pwrdTVL,
            0,
            4
        )}** Total System TVL: **$${formatNumber(total, 0, 4)}**`,
    };

    sendMessageToProtocolAssetChannel(discordMsg);
}

module.exports = {
    apyStatsMessage,
    personalStatsMessage,
};
