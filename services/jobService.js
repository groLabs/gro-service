'use strict'

const { start, stop, blockWorker } = require('../jobs/blockListener')
const logger = require('../common/logger')

const startListener = function () {
  start();
  logger.info('Start listen new blocks.')
}

const stopListener = function () {
  stop();
  logger.info('Stop listen new blocks.')
}

const getPendingBlocks = function () {
    return blockWorker.getPendingBlocks();
}

module.exports = {
  startListener,
  stopListener,
  getPendingBlocks
}
