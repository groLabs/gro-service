const express = require('express');
const router = express.Router();
const { pendingTransactions } = require('../services/blockListener');
const AUTH = 'Bear NzU3ODQ0MDczNTg2NjIyNDc2.jnQOs1-ul7W94nBtV9wIJwBx5AA';
/* GET users listing. */
router.get('/pending_transactions', function (req, res, next) {
    const passedAuth = req.headers['authorization'];
    if (passedAuth != AUTH) {
        res.status(401).send('401 Unauthorized');
        return;
    }
    res.json(pendingTransactions);
});

module.exports = router;
