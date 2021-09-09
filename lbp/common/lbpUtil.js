const fs = require('fs');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const statsDir = getConfig('stats_folder');

const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet':
                return 1;
            case 'ropsten':
                return 3;
            case 'rinkeby':
                return 4;
            case 'kovan':
                return 42;
            default:
                return -1;
        }
    } catch (err) {
        logger.error('Error in lbpUtil.js->getNetworkId():', err);
    }
};

const generateJSONFile = (data) => {
    try {
        const timestamp = moment().unix(); // TODO: include timestamp from data?
        console.log('timestamp', timestamp);
        const statsFilename = `${statsDir}/lbp-${timestamp}.json`;
        fs.writeFileSync(statsFilename, JSON.stringify(data));
        // logger to inform about file generated.
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    getNetworkId,
    generateJSONFile,
}
