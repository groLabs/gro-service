const moment = require('moment');
const { query } = require('./queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { QUERY_ERROR } = require('../constants');


const getPriceCheck = async () => {
    try {
        console.log('hey')
    } catch (err) {
        logger.error(`**DB: Error in groStatsHandler.js->getAllStats(): ${err}`);
    }
}

module.exports = {
    getPriceCheck,
}