const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    DISCORD_CHANNELS,
    sendMessage,
    sendMessageToProtocolEventChannel,
} = require('../common/discord/discordService');
const { getVaultAndStrategyLabels } = require('../contract/allContracts');

const { shortAccount } = require('../common/digitalUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

function harvestTriggerMessage(content) {
    const discordMessage = {
        type: MESSAGE_TYPES.harvestTrigger,
        message: 'No strategies need to run harvest',
        description: `${MESSAGE_EMOJI.company} No strategies need to run harvest`,
    };

    if (content.length > 0) {
        const { vaultName, vaultAddress, strategyName, strategyAddress } =
            content[0];
        discordMessage.message = `${vaultName}:${vaultAddress}'s ${strategyName} strategy need harvest.`;
        discordMessage.description = `${MESSAGE_EMOJI.company} ${vaultName}'s harvestTrigger on ${strategyName} return true, need run harvest`;
        discordMessage.urls = [
            {
                label: vaultName,
                type: 'account',
                value: vaultAddress,
            },
            {
                label: strategyName,
                type: 'account',
                value: strategyAddress,
            },
        ];
    }
    sendMessage(DISCORD_CHANNELS.botLogs, discordMessage);
    // sendMessageToProtocolEventChannel(discordMessage);
}

function harvestMessage(content) {
    const {
        vaultName,
        vaultAddress,
        transactionHash,
        strategyName,
        strategyAddress,
    } = content;
    const txLabel = shortAccount(transactionHash);
    const discordMessage = {
        type: MESSAGE_TYPES.harvest,
        message: `Calling strategyHarvest function to harvest ${vaultName}:${vaultAddress}'s ${strategyName}`,
        description: `${MESSAGE_EMOJI.company} ${txLabel} Calling ${vaultName}'s ${strategyName}'s harvest function`,
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
            {
                label: strategyName,
                type: 'account',
                value: strategyAddress,
            },
        ],
    };
    sendMessageToProtocolEventChannel(discordMessage);
}

function harvestTransactionMessage(content) {
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt } = content[i];
        const typeItems = type.split('-');
        const vaultName = getVaultAndStrategyLabels()[typeItems[1]].name;
        const strategyName =
            getVaultAndStrategyLabels()[typeItems[1]].strategies[typeItems[2]]
                .name;
        const label = shortAccount(hash);
        const discordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain`,
            description: `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action for ${vaultName}'s ${strategyName} confirmed to chain`,
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
            discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action for ${vaultName}'s ${strategyName} still pending`;
        } else if (!transactionReceipt.status) {
            discordMessage.message = `${type} transaction ${hash} reverted.`;
            discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action for ${vaultName}'s ${strategyName} is reverted`;
        }
        logger.info(discordMessage.message);
        sendMessageToProtocolEventChannel(discordMessage);
    }
}

module.exports = {
    harvestTriggerMessage,
    harvestMessage,
    harvestTransactionMessage,
};
