"use strict";
const { shortAccount } = require('../common/digitalUtil');
const { MESSAGE_TYPES, MESSAGE_EMOJI, DISCORD_CHANNELS, sendMessageToChannel, } = require('../dist/common/discord/discordService').default;
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
    sendMessageToChannel(DISCORD_CHANNELS.botLogs, discordMsg);
}
function apyStatsMessage(content) {
    const { vaultTVL, vaultApy, pwrdTVL, pwrdApy, total, utilRatio } = content;
    const msg = `${MESSAGE_EMOJI.Vault} Vault TVL: **$${formatNumber(vaultTVL, 18, 2)}** Vault APY (7d avg): **${formatNumber(vaultApy, 4, 2)}%**\n${MESSAGE_EMOJI[MESSAGE_TYPES.stats]} ${MESSAGE_EMOJI.PWRD} PWRD TVL: **$${formatNumber(pwrdTVL, 18, 2)} ** PWRD APY (7d avg): **${formatNumber(pwrdApy, 4, 2)}%**\n${MESSAGE_EMOJI[MESSAGE_TYPES.stats]} ${MESSAGE_EMOJI.company} Gro Protocol TVL: **$${formatNumber(total, 18, 2)} ** Utilization Ratio: **${formatNumber(utilRatio, 4, 2)}%**\n`;
    const discordMsg = {
        type: MESSAGE_TYPES.stats,
        message: `PWRD Dollar: ${pwrdTVL}\nPWRD APY: ${pwrdApy}\nVault: ${vaultTVL}\nVault PAY: ${vaultApy}\nTotalAssets:${total}`,
        description: msg,
    };
    sendMessageToChannel(DISCORD_CHANNELS.protocolAssets, discordMsg);
}
module.exports = {
    apyStatsMessage,
    personalStatsMessage,
};
