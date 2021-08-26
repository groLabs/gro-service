const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getAlchemyRpcProvider } = require('../../common/chainUtil');
const provider = getAlchemyRpcProvider('stats_personal');
const BlocksScanner = require('../../stats/common/blockscanner');
const scanner = new BlocksScanner(provider);


/// @notice Checks if date format and range are OK
/// @param  fromDate Start date of the range
/// @param  toDate End date of the range
/// @return True if dates are OK; false otherwise
const checkDateRange = (_fromDate, _toDate) => {
    try {
        const isFromDateOK = moment(_fromDate, 'DD/MM/YYYY', true).isValid();
        const isToDateOK = moment(_toDate, 'DD/MM/YYYY', true).isValid();

        if (isFromDateOK && isToDateOK) {
            const fromDate = moment(_fromDate, 'DD/MM/YYYY');
            const toDate = moment(_toDate, 'DD/MM/YYYY');
            if (toDate.isSameOrAfter(fromDate)) {
                return true;
            } else {
                logger.error(`fromDate ${_fromDate} is after toDate ${_toDate}`);
                return false;
            }
        } else {
            logger.error(`Incorrect date format (fromDate: ${_fromDate} toDate: ${_toDate})`);
            return false;
        }
    } catch (err) {
        logger.error(`Error in globalUtil->checkDateRange(): [fromDate ${_fromDate} toDate ${_toDate}]: ${err}`);
        return false;
    }
}

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
    checkDateRange,
    findBlockByDate,
}
