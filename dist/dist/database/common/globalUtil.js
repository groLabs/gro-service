"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderKey = exports.getProvider = exports.findBlockByDate = exports.checkDateRange = exports.calcRangeTimestamps = void 0;
const moment_1 = __importDefault(require("moment"));
const chainUtil_1 = require("../../common/chainUtil");
const blockscanner_1 = __importDefault(require("../../stats/common/blockscanner"));
// default key from BOT_ENV in config file => blockchain.alchemy_api_keys.default
const providerKey = 'default';
const provider = (0, chainUtil_1.getAlchemyRpcProvider)(providerKey);
const scanner = new blockscanner_1.default(provider);
const botEnvLogger = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnvLogger}/${botEnvLogger}Logger`);
/// @notice Calculate number of N-second intervals between start and end timestamps
///         (in case an historical data load is needed)
/// @param  start The start date of the interval in timestamp
/// @param  end The end date of the interval in timestamp
/// @param  interval The interval in seconds
/// @return Array of timestamps
const calcRangeTimestamps = (start, end, interval) => {
    try {
        let iterations = [];
        if (start === end) {
            iterations.push(moment_1.default.unix(start).utc());
            return iterations;
        }
        const search = (start, end) => {
            if (start <= end) {
                iterations.push(moment_1.default.unix(start).utc());
                start = start + interval;
                search(start, end);
            }
            return iterations;
        };
        return search(start, end);
    }
    catch (err) {
        logger.error(`**DB: Error in globalUtil.js->calcRangeTimestamps(): ${err}`);
    }
};
exports.calcRangeTimestamps = calcRangeTimestamps;
/// @notice Checks if date format and range are OK
/// @param  fromDate The Start date of the range in date format (DD/MM/YYYY)
/// @param  toDate The end date of the range in date format (DD/MM/YYYY)
/// @return True if dates are OK; false otherwise
const checkDateRange = (_fromDate, _toDate) => {
    try {
        const isFromDateOK = (0, moment_1.default)(_fromDate, 'DD/MM/YYYY', true).isValid();
        const isToDateOK = (0, moment_1.default)(_toDate, 'DD/MM/YYYY', true).isValid();
        if (isFromDateOK && isToDateOK) {
            const fromDate = (0, moment_1.default)(_fromDate, 'DD/MM/YYYY');
            const toDate = (0, moment_1.default)(_toDate, 'DD/MM/YYYY');
            if (toDate.isSameOrAfter(fromDate)) {
                return true;
            }
            else {
                logger.error(`fromDate ${_fromDate} is after toDate ${_toDate}`);
                return false;
            }
        }
        else {
            logger.error(`Incorrect date format (fromDate: ${_fromDate} toDate: ${_toDate})`);
            return false;
        }
    }
    catch (err) {
        logger.error(`Error in globalUtil->checkDateRange(): [fromDate ${_fromDate} toDate ${_toDate}]: ${err}`);
        return false;
    }
};
exports.checkDateRange = checkDateRange;
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
};
exports.findBlockByDate = findBlockByDate;
/// @notice Returns the Alchemy provider based on referring bot key
const getProvider = () => provider;
exports.getProvider = getProvider;
/// @notice Returns the Alchemy provider key
const getProviderKey = () => providerKey;
exports.getProviderKey = getProviderKey;
