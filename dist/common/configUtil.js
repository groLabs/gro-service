const config = require('config');
const { SettingError } = require('./error').default;
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
function getConfig(key, existCheck = true) {
    if (config.has(key))
        return config.get(key);
    if (existCheck) {
        const err = new SettingError(`Config: ${key} not set.`);
        logger.error(err);
        throw err;
    }
    return undefined;
}
module.exports = {
    getConfig,
};
