const express = require('express')
const router = express.Router()
const { wrapAsync } = require('../common/wrap')
const { param } = require('express-validator')
const { ParameterError } = require('../common/customErrors')
const { pendingTransactions } = require('../services/jobService')
const { generateReport } = require('../services/accountService')
const { validate } = require('../common/validate')
const AUTH = 'Bear NzU3ODQ0MDczNTg2NjIyNDc2.jnQOs1-ul7W94nBtV9wIJwBx5AA'

/* GET users listing. */
router.get('/pending_transactions', function (req, res, next) {
    const passedAuth = req.headers['authorization']
    if (passedAuth != AUTH) {
        res.status(401).send('401 Unauthorized')
        return
    }
    res.json(pendingTransactions)
})

/**
 * @api {get} /stats/user/:accountAddress?network=xxx Get /stats/user/:accountAddress?network=xxx
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
    '/user/:accountAddress',
    validate([
        param('accountAddress')
            .isString()
            .withMessage('accountAddress must be string.')
            .trim()
            .notEmpty()
            .withMessage('accountAddress can be empty.')
            .matches(/^0x[A-Za-z0-9]{40}/)
            .withMessage(
                'accountAddress should be a valid address start with "0x".'
            ),
    ]),
    wrapAsync(async function (req, res, next) {
        const passedAuth = req.headers['authorization']
        if (passedAuth != AUTH) {
            res.status(401).send('401 Unauthorized')
            return
        }
        const network = req.query.network || ''
        if (network.toLowerCase() != process.env.NODE_ENV.toLowerCase()) {
            throw new ParameterError('Parameter network failed.')
        }
        const result = await generateReport(req.params.accountAddress)
        res.json({ gro_personal_position: result })
    })
)

module.exports = router
