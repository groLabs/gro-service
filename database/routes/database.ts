import express from 'express';
import { query } from 'express-validator';
import { validate } from '../../common/validate';
import { ParameterError } from '../../common/error';
import { getDbStatus } from '../common/statusUtil';
// import { dumpTable } from '../common/pgUtil';
import { getAllStatsMC } from '../handler/groStatsHandlerMC';
import { getPriceCheck } from '../handler/priceCheckHandler';
import { getHistoricalAPY } from '../handler/historicalAPY';
import { getPersonalStatsMC } from '../handler/personalStatsHandlerMC';
import { etlPersonalStatsCache } from '../etl/etlPersonalStatsCache';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import { Status } from '../types';


const router = express.Router();

const wrapAsync = function wrapAsync(fn) {
    return function wrap(req, res, next) {
        fn(req, res, next).catch(next);
    };
};

// E.g.: http://localhost:3010/gro_stats_mc?network=mainnet
router.get(
    '/gro_stats_mc',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty`),
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.ts->router.get->/gro_stats_mc');
        }
        const groStats = await getAllStatsMC();
        res.json(groStats);
    })
);

// E.g.: http://localhost:3010/database/gro_personal_position_mc?network=mainnet&address=0x001C249c09090D79Dc350A286247479F08c7aaD7
router.get(
    '/gro_personal_position_mc',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty`),
        query('address')
            .notEmpty()
            .withMessage(`address can't be empty`)
            .isLength({ min: 42, max: 42 })
            .withMessage('address must be 42 characters long')
            .matches(/^0x[A-Za-z0-9]{40}/)
            .withMessage('should be a valid address and start with "0x"'),
    ]),
    wrapAsync(async (req, res) => {
        let { network, address } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError(`Parameter network failed in database: ${network.toLowerCase()} vs. ${process.env.NODE_ENV.toLowerCase()}`);
        }
        // Get status for feature_id = 1 (personalStats)
        const dbStatus = await getDbStatus(1);

        if (dbStatus.status === QUERY_SUCCESS && dbStatus.data.statusId === Status.ACTIVE) {
            // DB active -> provide personalStats from dbBot
            const load = await etlPersonalStatsCache(address);
            if (load) {
                const personalStats = await getPersonalStatsMC(address);
                res.json(personalStats);
            } else {
                res.json(
                    {
                        "gro_personal_position_mc": {
                            status: QUERY_ERROR.toString(),
                            data: 'Error while processing personalStats cache from DB: see logs in host',
                        }
                    }
                );
            }
        } else {
            // DB inactive or query error -> provide personalStats from statsBot
            const msg = dbStatus.data.statusId === Status.INACTIVE
                ? 'DB is inactive'
                : 'DB error when checking status';
            res.json(
                {
                    "gro_personal_position_mc": {
                        status: QUERY_ERROR.toString(),
                        data: msg,
                    }
                }
            );
        }

    })
);

// E.g.: http://localhost:3010/database/price_check?network=mainnet
router.get(
    '/price_check',
    validate([
        query('network')
            .trim()
            .notEmpty()
            .withMessage(`network can't be empty`),
    ]),
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.ts->router.get->/gro_stats');
        }
        const priceCheck = await getPriceCheck();
        res.json(priceCheck);
    })
);

//E.g.: http://localhost:3010/database/historical_apy?network=mainnet&attr=apy_last7d,apy_last7d,apy_last7d&freq=twice_daily,daily,weekly&start=1625097600,1625097600,1625097600&end=1629936000,1629936000,1629936000
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
        let { network, attr, freq, start, end } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed in database.ts->router.get()->/historical_apy');
        }
        const groStats = await getHistoricalAPY(attr, freq, start, end);
        res.json(groStats);
    })
);

// Disabled in order to avoid potential security issues
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

export default router;


