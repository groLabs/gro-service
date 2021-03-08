const express = require('express');
const { wrapAsync } = require('../common/wrap');
const router = express.Router();
const { subscribeNewBlock, unsubscribe } = require('../services/bot')

router.post(
  '/subscribe-new-block',
  async (req, res) => {
    const result = await subscribeNewBlock()
    res.json({
      result
    })
  }
)

router.post(
  '/unsubscribe',
  wrapAsync(async (req, res) => {
    const result = await unsubscribe()
    res.json({result})
  })
)

module.exports = router;
