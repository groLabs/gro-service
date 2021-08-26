const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessage,
    sendMessageToChannel,
} = require('../common/discord/discordService');
const { getVaultAndStrategyLabels } = require('../contract/allContracts');
const { shortAccount } = require('../common/digitalUtil');
const { sendAlertMessage } = require('../common/alertMessageSender');

function investTriggerMessage(content) {
    const { vaultName, vaultAddress, isInvested } = content;
    let msg = `${vaultName}'s investTrigger return false, doesn't need run invest`;
    if (isInvested) {
        msg = `${vaultName}'s investTrigger return true, need run invest`;
    }
    const discordMessage = {
        type: MESSAGE_TYPES.investTrigger,
        message: msg,
        description: msg,
        urls: [
            {
                label: vaultName,
                type: 'account',
                value: vaultAddress,
            },
        ],
    };
    sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
}

function investMessage(content) {
    const { vaultName, vaultAddress, transactionHash } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.invest,
        message: `Call ${vaultName}:${vaultAddress}'s invest function`,
        description: `${txLabel} Call ${vaultName}'s invest function`,
        urls: [
            {
                label: txLabel,
                type: 'tx',
                value: transactionHash,
            },
            {
                label: vaultName,
                type: 'account',
                value: vaultAddress,
            },
        ],
    };
    sendMessageToChannel(DISCORD_CHANNELS.protocolEvents, discordMessage);
}

function investTransactionMessage(content) {
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt, additionalData } =
            content[i];
        const typeItems = type.split('-');
        let action = typeItems[0];
        action = action.replace(action[0], action[0].toUpperCase());
        const vaultName = getVaultAndStrategyLabels()[typeItems[1]].name;
        const label = shortAccount(hash);
        const discordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain - $${additionalData} invested`,
            description: `${MESSAGE_EMOJI.company} ${label} ${action} action for ${vaultName} confirmed to chain - $${additionalData} invested`,
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
            sendMessageToChannel(DISCORD_CHANNELS.botLogs, discordMessage);
        } else if (!transactionReceipt.status) {
            discordMessage.description = `[WARN] B1 - ${label} ${action} action for ${vaultName} reverted`;
            sendAlertMessage({
                discord: discordMessage,
            });
        } else {
            sendMessageToChannel(
                DISCORD_CHANNELS.protocolEvents,
                discordMessage
            );
        }
    }
}

module.exports = {
    investTriggerMessage,
    investMessage,
    investTransactionMessage,
};
