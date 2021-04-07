const { SettingError } = require('./customErrors');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);
const config = require('config');

const getConfig = function (key, existCheck = true) {
    if (config.has(key)) {
        return config.get(key);
    } else if (existCheck) {
        const err = new SettingError(`Config: ${key} not set.`);
        logger.error(err);
        throw err;
    }
};

module.exports = {
    getConfig,
};
