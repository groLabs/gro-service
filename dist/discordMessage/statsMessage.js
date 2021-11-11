"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personalStatsMessage = exports.apyStatsMessage = void 0;
const digitalUtil_1 = require("../common/digitalUtil");
const discordService_1 = require("../common/discord/discordService");
const digitalUtil_2 = require("../common/digitalUtil");
function personalStatsMessage(content) {
    const label = (0, digitalUtil_1.shortAccount)(content.address);
    const discordMsg = {
        type: discordService_1.MESSAGE_TYPES.miniStatsPersonal,
        description: `${label} loaded their personal data`,
        urls: [
            {
                label,
                type: 'account',
                value: content.address,
            },
        ],
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.botLogs, discordMsg);
}
exports.personalStatsMessage = personalStatsMessage;
function apyStatsMessage(content) {
    const { vaultTVL, vaultApy, pwrdTVL, pwrdApy, total, utilRatio } = content;
    const msg = `${discordService_1.MESSAGE_EMOJI.Vault} Vault TVL: **$${(0, digitalUtil_2.formatNumber)(vaultTVL, 18, 2)}** Vault APY (7d avg): **${(0, digitalUtil_2.formatNumber)(vaultApy, 4, 2)}%**\n${discordService_1.MESSAGE_EMOJI[discordService_1.MESSAGE_TYPES.stats]} ${discordService_1.MESSAGE_EMOJI.PWRD} PWRD TVL: **$${(0, digitalUtil_2.formatNumber)(pwrdTVL, 18, 2)} ** PWRD APY (7d avg): **${(0, digitalUtil_2.formatNumber)(pwrdApy, 4, 2)}%**\n${discordService_1.MESSAGE_EMOJI[discordService_1.MESSAGE_TYPES.stats]} ${discordService_1.MESSAGE_EMOJI.company} Gro Protocol TVL: **$${(0, digitalUtil_2.formatNumber)(total, 18, 2)} ** Utilization Ratio: **${(0, digitalUtil_2.formatNumber)(utilRatio, 4, 2)}%**\n`;
    const discordMsg = {
        type: discordService_1.MESSAGE_TYPES.stats,
        message: `PWRD Dollar: ${pwrdTVL}\nPWRD APY: ${pwrdApy}\nVault: ${vaultTVL}\nVault PAY: ${vaultApy}\nTotalAssets:${total}`,
        description: msg,
    };
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolAssets, discordMsg);
}
exports.apyStatsMessage = apyStatsMessage;
