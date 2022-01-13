import { getAlchemyRpcProvider } from '../../common/chainUtil';
import { BlockWorker } from './blockWorker';
const logger = require('../statsLogger');

const provider = getAlchemyRpcProvider();

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

export { blockWorker, start, stop };
