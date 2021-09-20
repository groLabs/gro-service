const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const hostEnv = process.env.HOST_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('../handler/queryHandler');
const { QUERY_ERROR } = require('../constants');


const loadLbp = async (data) => {
    try {
        // Load data into LBP_BALANCER_HOST*
        const res = await query(`insert_lbp_balancer_${hostEnv}.sql`, data);
        if (res.status !== QUERY_ERROR) {
            const price = ` (price: ${data[4]},`;
            const balance = `balance: ${data[5]},`;
            const date = `date: ${moment.utc(data[0]).format('DD/MM/YYYY HH:mm:ss')})`;
            logger.info(`**LBP: 1 record added into LBP_BALANCER_V1 ${price} ${balance} ${date}`);
            return true;
        } else {
            logger.error(`**LBP: Error in loadLbp.js->loadLbp(): loading data into LBP_BALANCER_V1`);
            return false;
        }
    } catch (err) {
        logger.error(`**LBP: Error in loadLbp.js->loadLbp(): ${err}`);
        return false;
    }
}

const removeLbp = async (start, end) => {
    try {
        // delete data from LBP_BALANCER_HOST*
        const res = await query(`delete_lbp_balancer_${hostEnv}.sql`, [start, end]);
        if (res.status !== QUERY_ERROR) {
            logger.info(`**LBP: ${res.rowCount} record/s removed from LBP_BALANCER_V1`);
            return true;
        } else {
            logger.error(`**LBP: Error in loadLbp.js->removeLbp(): removing data from LBP_BALANCER_V1`);
            return false;
        }
    } catch (err) {
        logger.error(`**LBP: Error in loadLbp.js->removeLbp(): ${err}`);
        return false;
    }
}

module.exports = {
    loadLbp,
    removeLbp,
}
