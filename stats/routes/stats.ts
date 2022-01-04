import { Router } from 'express';
import cors from 'cors';

import { query } from 'express-validator';
import { wrapAsync } from '../common/wrap';
import { ParameterError } from '../../common/error';
import { getGroStatsContent, getGroStatsMcContent, getArgentStatsContent, getExternalStatsContent, reloadContractsFromRegistry } from '../services/statsService';
import { generateReport } from '../services/newAccountService';
import { ethereumPersonalStats } from '../services/ethereumAccountService';
// const { getPersonalStats } = require('../../database/handler/personalHandler');
import { getGroPrice, isValidBlockNumber, getBuoyStartBlock } from '../handler/priceHandler';
import { generateHistoricalStats } from '../handler/statsHandler';
import { validate } from '../common/validate';
import { postDegenScore } from '../services/degenscoreService';
import { personalStatsMessage } from '../../discordMessage/statsMessage';
import { contractCallFailedCount } from '../common/contractStorage';
import { updateOGAirdropFile } from '../services/airdropService';

const router = Router();

/**
 * @api {get} /stats/user Get /stats/user
 * @apiName GetPersonalStats
 * @apiDescription Get user's own asset statistics
 * @apiGroup Stats
 * @apiSuccess {json} gro_personal_position
 * @apiSuccessExample {json} Success-Response
 * {
    "gro_personal_position": {
        "current_timestamp" : "1615320295",
        "launch_timestamp" : "1614024295",
        "network" : "kovan",
        "address" : "0xA80d8051D2CAf98aDf7D9079Ec13a34783B7cBf7",
        "amount_added" : {
            "pwrd" : "450.43",
            "gvt" : "1200.54",
            "total" : "1650.97"
        },
        "amount_removed" : {
            "pwrd" : "0.00",
            "gvt" : "1150.42",
            "total" : "1150.42"
        },
        "net_amount_added" : {
            "pwrd" : "450.43",
            "gvt" : "50.12",
            "total" : "500.55"
        },
        "current_balance" : {
            "pwrd" : "490.12",
            "gvt" : "49.50",
            "total" : "539.62"
        },
        "net_returns" : {
            "pwrd" : "39.69",
            "gvt" : "-0.62",
            "total" : "39.07"
        },
        "net_returns_ratio" : {
            "pwrd" : "0.08812",
            "gvt" : "-0.1237",
            "total" : "0.07805"
        }
    }
}
 */
router.get(
    '/gro_personal_position/',
    validate([
        query('address')
            .isString()
            .withMessage('address must be string.')
            .trim()
            .notEmpty()
            .withMessage('address cannot be empty.')
            .matches(/^0x[A-Za-z0-9]{40}/)
            .withMessage('address should be a valid address start with "0x".'),
        query('network').trim().notEmpty().withMessage('network can be empty.'),
    ]),
    wrapAsync(async (req, res) => {
        const { network } = req.query;
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        const result = await ethereumPersonalStats(req.query.address);
        personalStatsMessage({ address: req.query.address });
        contractCallFailedCount.personalStats = 0;
        res.json({ gro_personal_position: result });
    })
);

router.get(
    '/gro_personal_position_mc/',
    validate([
        query('address')
            .isString()
            .withMessage('address must be string.')
            .trim()
            .notEmpty()
            .withMessage('address cannot be empty.')
            .matches(/^0x[A-Za-z0-9]{40}/)
            .withMessage('address should be a valid address start with "0x".'),
        query('network').trim().notEmpty().withMessage('network can be empty.'),
    ]),
    wrapAsync(async (req, res) => {
        const { network } = req.query;
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        const result = await generateReport(req.query.address);
        personalStatsMessage({ address: req.query.address });
        contractCallFailedCount.personalMCStats = 0;
        res.json(result);
    })
);

router.get(
    '/gro_stats',
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        const groStats = await getGroStatsContent();
        res.json({ gro_stats: groStats });
    })
);

router.get(
    '/gro_stats_mc',
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        const groStatsMc = await getGroStatsMcContent();
        res.json({ gro_stats_mc: groStatsMc });
    })
);

router.get(
    '/update_og_airdrop',
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        await updateOGAirdropFile();
        res.json({ result: 'success' });
    })
);

router.get(
    '/gro_argent_stats',
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        const groStats = await getArgentStatsContent();
        res.json({ gro_argent_stats: groStats });
    })
);

router.get(
    '/gro_external_stats',
    wrapAsync(async (req, res) => {
        let { network } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        const groStats = await getExternalStatsContent();
        res.json({ gro_external_stats: groStats });
    })
);

// router.get(
//     '/gro_personal_position_db',
//     validate([
//         query('address')
//             .isString()
//             .withMessage('address must be string.')
//             .trim()
//             .notEmpty()
//             .withMessage('address cannot be empty.')
//             .matches(/^0x[A-Za-z0-9]{40}/)
//             .withMessage('address should be a valid address start with "0x".'),
//         query('network').trim().notEmpty().withMessage('network can be empty.'),
//         query('date').matches(
//             /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/
//         ),
//         // .matches(/^\d{10}$/),  //if unix timestamp
//     ]),
//     wrapAsync(async (req, res) => {
//         let { network } = req.query;
//         network = network || '';
//         if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
//             throw new ParameterError('Parameter network failed.');
//         }
//         const groStats = await getPersonalStats(
//             req.query.date,
//             req.query.address
//         );
//         res.json(groStats);
//     })
// );

router.get(
    '/gro_price_check',
    wrapAsync(async (req, res) => {
        let { network, block } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        block = block || 'latest';
        if (!isValidBlockNumber(block)) {
            const buoyStartBlock = getBuoyStartBlock();
            throw new ParameterError(
                `Parameter block should be bigger than ${buoyStartBlock}.`
            );
        }
        const pricing = await getGroPrice(block);
        res.json({ pricing });
    })
);

router.get(
    '/historical_gro_stats',
    wrapAsync(async (req, res) => {
        let { network, attr, block } = req.query;
        network = network || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network is invalid.');
        }
        if (attr === undefined || attr.toLowerCase() !== 'apy.last7d') {
            throw new ParameterError('Parameter attr is invalid.');
        }
        if (block === undefined || block === '') {
            throw new ParameterError('Parameter block is invalid.');
        }
        const groStats = await generateHistoricalStats(
            parseInt(block, 10),
            attr
        );
        res.json({ historical_gro_stats: groStats });
    })
);

router.get(
    '/reload_contracts',
    wrapAsync(async (req, res) => {
        let { network, providerKey } = req.query;
        network = network || '';
        providerKey = providerKey || '';
        if (network.toLowerCase() !== process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.');
        }
        if (providerKey.length === 0) {
            throw new ParameterError('Parameter providerKey failed.');
        }
        const result = await reloadContractsFromRegistry(providerKey);
        res.json(result);
    })
);

router.options('/degenscore', cors());

router.post(
    '/degenscore',
    wrapAsync(async (req, res) => {
        const data = await postDegenScore(req.body);
        res.json({ degenscore: data });
    })
);

export default router;
