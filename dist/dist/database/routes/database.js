const express = require('express');
const cors = require('cors');
const router = express.Router();
const { query } = require('express-validator');
// const { wrapAsync } = require('../common/wrap');
const { ParameterError } = require('../../dist/common/error');
const { getAllStats } = require('../handler/groStatsHandler');
const { getPriceCheck } = require('../handler/priceCheckHandler');
const { getHistoricalAPY } = require('../handler/historicalAPY');
const { getPersonalStats } = require('../handler/personalStatsHandler');
const { dumpTable } = require('../common/pgUtil');
const { validate } = require('../../stats/common/validate');
const { personalStatsMessage } = require('../../dist/discordMessage/statsMessage');
const wrapAsync = function wrapAsync(fn) {
    return function wrap(req, res, next) {
        fn(req, res, next).catch(next);
    };
};
router.get('/gro_stats', validate([
    query('network')
        .trim()
        .notEmpty()
        .withMessage(`network can't be empty.`),
]), wrapAsync(async (req, res) => {
    let { network } = req.query;
    network = network || '';
    if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
        throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
    }
    const groStats = await getAllStats();
    res.json(groStats);
}));
router.get('/personal_stats', validate([
    query('network')
        .trim()
        .notEmpty()
        .withMessage(`network can't be empty.`),
    query('address')
        .notEmpty()
        .withMessage(`address can't be empty`)
        .isLength({ min: 42, max: 42 })
        .withMessage('address must be 42 characters long')
        .matches(/^0x[A-Za-z0-9]{40}/)
        .withMessage('should be a valid address and start with "0x".'),
]), wrapAsync(async (req, res) => {
    let { network, address } = req.query;
    network = network || '';
    if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
        throw new ParameterError(`Parameter network failed in database: ${network.toLowerCase()} vs. ${process.env.NODE_ENV.toLowerCase()}`);
    }
    console.log('OKI:', network, address);
    const personalStats = await getPersonalStats(address);
    res.json(personalStats);
}));
router.get('/price_check', validate([
    query('network')
        .trim()
        .notEmpty()
        .withMessage(`network can't be empty.`),
]), wrapAsync(async (req, res) => {
    let { network } = req.query;
    network = network || '';
    if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
        throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
    }
    const priceCheck = await getPriceCheck();
    res.json(priceCheck);
}));
//http://localhost:3010/database/historical_apy?network=ropsten&attr=apy_last7d,apy_last7d,apy_last7d&freq=twice_daily,daily,weekly&start=1625097600,1625097600,1625097600&end=1629936000,1629936000,1629936000
router.get('/historical_apy', validate([
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
]), wrapAsync(async (req, res) => {
    let { network, attr, freq, start, end } = req.query;
    network = network || '';
    if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
        throw new ParameterError('Parameter network failed in database.js->router.get->/historical_apy');
    }
    const groStats = await getHistoricalAPY(attr, freq, start, end);
    res.json(groStats);
}));
// router.get(
//     '/table_dump',
//     validate([
//         query('network')
//             .trim()
//             .notEmpty()
//             .withMessage(`network can't be empty.`),
//         query('table')
//             .trim()
//             .notEmpty()
//             .withMessage(`table can't be empty.`),
//     ]),
//     wrapAsync(async (req, res) => {
//         let { network, table } = req.query;
//         network = network || '';
//         if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
//             throw new ParameterError('Parameter network failed in database.js->router.get->/gro_stats');
//         }
//         const tableDump = await dumpTable(table, false);
//         res.set('Content-Type', 'application/octet-stream');
//         res.send(tableDump);
//     })
// );
module.exports = router;
