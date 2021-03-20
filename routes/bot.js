const express = require('express');
const { wrapAsync } = require('../common/wrap');
const router = express.Router();
const { start, stop, getPendingBlocks } = require('../services/blockListener');

router.post('/subscribe-new-block', async (req, res) => {
    start();
    res.json({ status: 'starting' });
});

router.post(
    '/unsubscribe',
    wrapAsync(async (req, res) => {
        stop();
        res.json({ status: 'stopping' });
    })
);

router.get(
    '/get-pending-blocks',
    wrapAsync(async (req, res) => {
        const result = getPendingBlocks();
        res.json(result);
    })
);

module.exports = router;
