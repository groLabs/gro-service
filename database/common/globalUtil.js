const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const provider = getAlchemyRpcProvider('stats_personal');
const BlocksScanner = require('../../stats/common/blockscanner');
const scanner = new BlocksScanner(provider);


/// @notice Finds the block number given a date
/// @param  scanDate Target timestamp
/// @param  after True if timestamp is after the date; False otherwise
/// @dev    When looking for a block at 23:59:59 on day X, parameter 'after' should be set fo 'false' 
///         in order to ensure the block falls into date X and not X+1
/// @return Block number for a given date
const findBlockByDate = async (scanDate, after = true) => {
    const blockFound = await scanner
        .getDate(scanDate.toDate(), after)
        .catch((err) => {
            logger.error(`Could not get block for ${scanDate}: ${err}`);
        });
    return blockFound;
}

module.exports = {
    findBlockByDate,
}
