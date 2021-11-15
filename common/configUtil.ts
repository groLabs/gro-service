import config from 'config';
import { SettingError } from './error';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

export function getConfig(key, existCheck = true) {
    if (config.has(key)) return config.get(key);

    if (existCheck) {
        const err = new SettingError(`Config: ${key} not set.`);
        logger.error(err);
        throw err;
    }

    return undefined;
}


