const express = require('express');

const router = express.Router();
const { query } = require('express-validator');
const { wrapAsync } = require('../common/wrap');
const { ParameterError } = require('../../common/error');
const { getGroStatsContent } = require('../services/statsService');
const { generateReport } = require('../services/accountService');
const { validate } = require('../common/validate');
const { shortAccount } = require('../../common/digitalUtil');
const {
    MESSAGE_TYPES,
    sendMessageToTradeChannel,
} = require('../../common/discord/discordService');

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
        const result = await generateReport(req.query.address);
        const label = shortAccount(req.query.address);
        const discordMsg = {
            type: MESSAGE_TYPES.miniStatsPersonal,
            description: `${label} pulled down his personal data`,
            urls: [
                {
                    label,
                    type: 'account',
                    value: req.query.address,
                },
            ],
            message: `${req.query.address} pulled down his personal data`,
        };
        sendMessageToTradeChannel(discordMsg);
        res.json({ gro_personal_position: result });
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

module.exports = router;
