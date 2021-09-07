const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet':
                return 1;
            case 'ropsten':
                return 3;
            case 'kovan':
                return 42;
            default:
                return -1;
        }
    } catch (err) {
        logger.error('Error in lbpUtil.js->getNetworkId():', err);
    }
};

module.exports = {
    getNetworkId,
}
