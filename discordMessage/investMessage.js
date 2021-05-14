const {
    MESSAGE_TYPES,
    MESSAGE_EMOJI,
    sendMessageToProtocolEventChannel,
} = require('../common/discord/discordService');
const { getVaultAndStrategyLabels } = require('../contract/allContracts');

const { shortAccount } = require('../common/digitalUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

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
    sendMessageToProtocolEventChannel(discordMessage);
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
    sendMessageToProtocolEventChannel(discordMessage);
}

function investTransactionMessage(content) {
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt } = content[i];
        const typeItems = type.split('-');
        const vaultName = getVaultAndStrategyLabels()[typeItems[1]].name;
        const label = shortAccount(hash);
        const discordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain`,
            description: `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action for ${vaultName} confirmed to chain`,
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
            discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action for ${vaultName} still pending`;
        } else if (!transactionReceipt.status) {
            discordMessage.message = `${type} transaction ${hash} reverted.`;
            discordMessage.description = `${MESSAGE_EMOJI.company} ${label} ${typeItems[0]} action is reverted`;
        }
        logger.info(discordMessage.message);
        sendMessageToProtocolEventChannel(discordMessage);
    }
}

module.exports = {
    investTriggerMessage,
    investMessage,
    investTransactionMessage,
};
