'use strict';

const { BigNumber } = require('ethers');
const { getBuoy } = require('../../contract/allContracts');
const { pendingTransactions } = require('../../common/storage');
const {
    sendMessage,
    MESSAGE_TYPES,
    DISCORD_CHANNELS,
} = require('../../common/discord/discordService');
const logger = require('../../common/logger');

const curveCheck = async function () {
    const healthCheck = await getBuoy()
        .checkCurveHealth()
        .catch((error) => {
            logger.error(error);
            sendMessage(DISCORD_CHANNELS.critActionEvents, {
                result: 'Failed: call curveCheck.',
                type: MESSAGE_TYPES.curveCheck,
                timestamp: new Date(),
            });
            return false;
        });
    logger.info(`check Curve. ${healthCheck}`);
    sendMessage(DISCORD_CHANNELS.critActionEvents, {
        result: healthCheck,
        type: MESSAGE_TYPES.curveCheck,
        timestamp: new Date(),
    });
    return healthCheck;
};

module.exports = {
    curveCheck,
};
