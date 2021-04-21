const { getBuoy } = require('../../contract/allContracts');
const { ContractCallError } = require('../../common/error');
const {
    sendMessageToCriticalEventChannel,
    MESSAGE_TYPES,
} = require('../../common/discord/discordService');
const logger = require('../criticalLogger');

async function curveCheck() {
    const healthCheck = await getBuoy()
        .checkCurveHealth()
        .catch((error) => {
            logger.error(error);
            throw new ContractCallError(
                'Check curve health failed.',
                MESSAGE_TYPES.curveCheck
            );
        });
    sendMessageToCriticalEventChannel({
        message: `Current curve health is ${healthCheck}`,
        type: MESSAGE_TYPES.curveCheck,
    });
    return healthCheck;
}

module.exports = {
    curveCheck,
};
