const express = require('express');
const cors = require('cors');
const router = express.Router();
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { query } = require('express-validator');
const { ParameterError } = require('../../common/error');
const { validate } = require('../../stats/common/validate');
const { personalStatsMessage } = require('../../discordMessage/statsMessage');
const { getLbpStatsDB } = require('../handler/lbpHandler');

const wrapAsync = function wrapAsync(fn) {
    return function wrap(req, res, next) {
        fn(req, res, next).catch(next);
    };
};

//  http://localhost:3011/lbp/lbp_stats?network=mainnet
router.get(
    '/lbp_stats',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty.`),
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== nodeEnv) {
            // throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
            logger.warn(`Warning in routes->lbp_stats: wrong network <${network.toLowerCase()}>`)
        } else {
            const lbpStats = await getLbpStatsDB();
            res.json(lbpStats);
        }
    })
);

module.exports = router;


