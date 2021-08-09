const express = require('express');
const cors = require('cors');
const router = express.Router();
const { query } = require('express-validator');
// const { wrapAsync } = require('../common/wrap');
const { ParameterError } = require('../../common/error');
const { getAllStats } = require('../handler/groStatsHandler');
const { getPriceCheck } = require('../handler/priceCheckHandler');
const { getHistoricalAPY } = require('../handler/historicalAPY');
const { validate } = require('../../stats/common/validate');
const { personalStatsMessage } = require('../../discordMessage/statsMessage');

const wrapAsync = function wrapAsync(fn) {
    return function wrap(req, res, next) {
        fn(req, res, next).catch(next);
    };
};

router.get(
    '/gro_stats',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty.`),
        // query('date')
        //     .matches(/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/),
        //     .matches(/^\d{10}$/),  //if unix timestamp
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
        }
        const groStats = await getAllStats();
        res.json(groStats);
    })
);

router.get(
    '/price_check',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty.`),
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
        }
        const priceCheck = await getPriceCheck();
        res.json(priceCheck);
    })
);

//http://localhost:3010/database/historical_apy?network=ropsten&attr=apy_last7d,apy_last7d,apy_last7d&freq=twice_daily,daily,weekly&start=1625097600,1625097600,1625097600&end=1629936000,1629936000,1629936000
router.get(
    '/historical_apy',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty`),
        query('attr')
            .notEmpty()
            .withMessage(`attr can't be empty`),
        query('freq')
            .notEmpty()
            .withMessage(`freq can't be empty`),
        query('start')
            .notEmpty()
            .withMessage(`start can't be empty`),
        query('end')
            .notEmpty()
            .withMessage(`end can't be empty`),
    ]),
    wrapAsync(async (req, res) => {
        // TODO: check data is correct
        let { network, attr, freq, start, end } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.js->router.get->/historical_apy');
        }
        const groStats = await getHistoricalAPY(attr, freq, start, end);
        res.json(groStats);
    })
);

module.exports = router;


