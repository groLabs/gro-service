const express = require('express')
const { wrapAsync } = require('../common/wrap')
const router = express.Router()
const {
    startListener,
    stopListener,
    getPendingBlocks,
} = require('../services/jobService')

router.post('/subscribe-new-block', async (req, res) => {
    startListener()
    res.json({ status: 'starting' })
})

router.post(
    '/unsubscribe',
    wrapAsync(async (req, res) => {
        stopListener()
        res.json({ status: 'stopping' })
    })
)

router.get(
    '/get-pending-blocks',
    wrapAsync(async (req, res) => {
        const result = getPendingBlocks()
        res.json(result)
    })
)

module.exports = router
