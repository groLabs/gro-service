const express = require('express');
const cors = require('cors');
const router = express.Router();
const { query } = require('express-validator');
// const { wrapAsync } = require('../common/wrap');
const { ParameterError } = require('../../common/error');
const { getAllStats } = require('../handler/groStatsHandler')
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
        // .matches(/^\d{10}$/),  //if unix timestamp
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats.');
        }
        const groStats = await getAllStats();
        res.json(groStats);
    })
);

module.exports = router;
