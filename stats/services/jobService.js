'use strict';

//const { start, stop, blockWorker } = require('../jobs/blockListener')
const logger = require('../statsLogger');

const startListener = function () {
    //start();
    logger.info('Start listen new blocks.');
};

const stopListener = function () {
    //stop();
    logger.info('Stop listen new blocks.');
};

const getPendingBlocks = function () {
    return {};
    //return blockWorker.getPendingBlocks();
};

module.exports = {
    startListener,
    stopListener,
    getPendingBlocks,
};
