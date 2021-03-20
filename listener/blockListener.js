'use strict';

const { getDefaultProvider } = require('../common/chainUtil');
const logger = require('../common/logger');
const BlockWorker = require('./blockWorker');
const provider = getDefaultProvider();

const blockWorker = new BlockWorker();

const handleBlock = function (blockNumber) {
    blockWorker.handleNewBlock(blockNumber);
};

const start = function () {
    provider.on('block', handleBlock).on('error', function (err) {
        logger.error(err);
    });
    logger.info('Start listen new blocks.');
};

const stop = function () {
    provider.off('block');
    logger.info('Stop listen new blocks.');
};

module.exports = {
    blockWorker,
    start,
    stop,
};
