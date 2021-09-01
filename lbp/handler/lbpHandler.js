/// Sergi to create a handler to transform LBP data retrieved from the DB
/// into a readable format for the FE

const moment = require('moment');
const { query } = require('../../database/handler/queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { QUERY_ERROR } = require('../constants');

const getLbpStats = () => {
    console.log('provide LBP data to FE');
    return {};
}

module.exports = {
    getLbpStats,
}