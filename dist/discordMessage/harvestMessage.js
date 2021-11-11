"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.harvestTransactionMessage = exports.harvestMessage = exports.harvestTriggerMessage = void 0;
const ethers_1 = require("ethers");
const discordService_1 = require("../common/discord/discordService");
const allContracts_1 = require("../contract/allContracts");
const alertMessageSender_1 = require("../common/alertMessageSender");
const digitalUtil_1 = require("../common/digitalUtil");
function harvestTriggerMessage(content) {
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.harvestTrigger,
        message: 'No strategies need to run harvest',
        description: `${discordService_1.MESSAGE_EMOJI.company} No strategies need to run harvest`,
    };
    if (content.length > 0) {
        const { vaultName, vaultAddress, strategyName, strategyAddress } = content[0];
        discordMessage.message = `${vaultName}:${vaultAddress}'s ${strategyName} strategy need harvest.`;
        discordMessage.description = `${discordService_1.MESSAGE_EMOJI.company} ${vaultName}'s harvestTrigger on ${strategyName} return true, need run harvest`;
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
    (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
}
exports.harvestTriggerMessage = harvestTriggerMessage;
function harvestMessage(content) {
    const { vaultName, vaultAddress, transactionHash, strategyName, strategyAddress, } = content;
    const txLabel = (0, digitalUtil_1.shortAccount)(transactionHash);
    const discordMessage = {
        type: discordService_1.MESSAGE_TYPES.harvest,
        message: `Calling strategyHarvest function to harvest ${vaultName}:${vaultAddress}'s ${strategyName}`,
        description: `${discordService_1.MESSAGE_EMOJI.company} ${txLabel} Calling ${vaultName}'s ${strategyName}'s harvest function`,
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
    (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
}
exports.harvestMessage = harvestMessage;
function formatHarvestAmount(decimal, data) {
    let harvestAmount = '0.00';
    const zero = ethers_1.BigNumber.from(0);
    if (data[1] && data[1].gt(zero)) {
        harvestAmount = (0, digitalUtil_1.formatNumber)(data[1], decimal, 2);
    }
    else if (data[2] && data[2].gt(zero)) {
        harvestAmount = `-${(0, digitalUtil_1.formatNumber)(data[2], decimal, 2)}`;
    }
    return harvestAmount;
}
function harvestTransactionMessage(content) {
    for (let i = 0; i < content.length; i += 1) {
        const { type, msgLabel, hash, transactionReceipt, additionalData } = content[i];
        const typeItems = type.split('-');
        let action = typeItems[0];
        action = action.replace(action[0], action[0].toUpperCase());
        const coin = (0, allContracts_1.getVaultStableCoins)().tokens[typeItems[1]];
        const stableCoinDecimal = (0, allContracts_1.getVaultStableCoins)().decimals[coin] || 18;
        const vaultName = (0, allContracts_1.getVaultAndStrategyLabels)()[typeItems[1]].name;
        const strategyName = (0, allContracts_1.getVaultAndStrategyLabels)()[typeItems[1]].strategies[typeItems[2]]
            .name;
        const label = (0, digitalUtil_1.shortAccount)(hash);
        const discordMessage = {
            type: msgLabel,
            message: `${type} transaction ${hash} has mined to chain - gain: ${additionalData[0]}, loss: ${additionalData[1]}, debtPaid: ${additionalData[2]}, debtAdded: ${additionalData[6]}`,
            description: `${discordService_1.MESSAGE_EMOJI.company} ${label} ${action} action for ${vaultName}'s ${strategyName} confirmed to chain - $${formatHarvestAmount(stableCoinDecimal, additionalData)} harvested`,
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
            (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.botLogs, discordMessage);
        }
        else if (!transactionReceipt.status) {
            discordMessage.description = `[WARN] B2 - ${label} ${action} txn for ${vaultName}'s ${strategyName} reverted`;
            (0, alertMessageSender_1.sendAlertMessage)({
                discord: discordMessage,
            });
        }
        else {
            (0, discordService_1.sendMessageToChannel)(discordService_1.DISCORD_CHANNELS.protocolEvents, discordMessage);
        }
    }
}
exports.harvestTransactionMessage = harvestTransactionMessage;
