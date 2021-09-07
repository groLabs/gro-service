/// Sergi to implement a new route to provide LBP data to the FE

const express = require('express');
const cors = require('cors');
const router = express.Router();
const { query } = require('express-validator');
const { ParameterError } = require('../../common/error');
const { validate } = require('../../stats/common/validate');
const { personalStatsMessage } = require('../../discordMessage/statsMessage');
const { getLbpStats } = require('../handler/lbpHandler');

const wrapAsync = function wrapAsync(fn) {
    return function wrap(req, res, next) {
        fn(req, res, next).catch(next);
    };
};

//  http://localhost:3011/lbp/lbp_stats?network=mainnet&timestamp=1619843541
router.get(
    '/lbp_stats',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty.`),
        // query('timestamp')
        //     .matches(/^\d{10}$/),
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
        }
        const lbpStats = await getLbpStats();
        res.json(lbpStats);
    })
);

module.exports = router;


