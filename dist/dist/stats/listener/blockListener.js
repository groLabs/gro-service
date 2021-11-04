"use strict";
const { getDefaultProvider } = require('../../common/chainUtil');
const logger = require('../statsLogger');
const BlockWorker = require('./blockWorker');
const provider = getDefaultProvider();
const blockWorker = new BlockWorker();
function handleBlock(blockNumber) {
    blockWorker.handleNewBlock(blockNumber);
}
function start() {
    provider.on('block', handleBlock).on('error', (err) => {
        logger.error(err);
    });
    logger.info('Start listen new blocks.');
}
function stop() {
    provider.off('block');
    logger.info('Stop listen new blocks.');
}
module.exports = {
    blockWorker,
    start,
    stop,
};
