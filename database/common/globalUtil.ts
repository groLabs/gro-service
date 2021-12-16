// default key from BOT_ENV in config file => blockchain.alchemy_api_keys.default
import moment from 'moment';
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
import {
    Network,
    NetworkId,
    GlobalNetwork
} from '../types';
// ETH config
import { getAlchemyRpcProvider } from '../../common/chainUtil';
import BlocksScanner from './blockscanner';
const providerKey = 'default';
const provider = getAlchemyRpcProvider(providerKey);
const scanner = new BlocksScanner(provider);
// AVAX config
import { ethers } from 'ethers';
import { getConfig } from '../../common/configUtil';
const rpcURL: any =
    getConfig('blockchain.avalanche_rpc_url', false) ||
    'https://api.avax.network/ext/bc/C/rpc';
const providerAVAX = new ethers.providers.JsonRpcProvider(rpcURL);
const scannerAvax = new BlocksScanner(providerAVAX);


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
            iterations.push(moment.unix(start).utc());
            return iterations;
        }
        const search = (start, end) => {
            if (start <= end) {
                iterations.push(moment.unix(start).utc());
                start = start + interval;
                search(start, end);
            }
            return iterations;
        }
        return search(start, end);
    } catch (err) {
        logger.error(`**DB: Error in globalUtil.js->calcRangeTimestamps(): ${err}`);
    }
}

/// @notice Checks if date format and range are OK
/// @param  fromDate The Start date of the range in date format (DD/MM/YYYY)
/// @param  toDate The end date of the range in date format (DD/MM/YYYY)
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

const findBlockByDateAvax = async (scanDate, after = true) => {
    const blockFound = await scannerAvax
        .getDate(scanDate.toDate(), after)
        .catch((err) => {
            logger.error(`Could not get block for ${scanDate}: ${err}`);
        });
    return blockFound;
}


/// @notice Returns the Alchemy provider based on referring bot key
const getProvider = () => provider;

/// @notice Returns the Alchemy provider key
const getProviderKey = () => providerKey;

/// @notice Returns the Avax provider
const getProviderAvax = () => providerAVAX;

/// @notice Returns the network id
const getNetworkId2 = (network: GlobalNetwork) => {
    try {
        if (network === GlobalNetwork.ETHEREUM) {
            if (nodeEnv === Network.MAINNET) {
                return NetworkId.MAINNET;
            } else if (nodeEnv === Network.ROPSTEN) {
                return NetworkId.ROPSTEN;
            } else if (nodeEnv === Network.RINKEBY) {
                return NetworkId.RINKEBY;
            } else if (nodeEnv === Network.GOERLI) {
                return NetworkId.GOERLI;
            } else {
                return NetworkId.UNKNOWN;
            }
        } else if (network === GlobalNetwork.AVALANCHE) {
            return NetworkId.AVALANCHE;
        } else {
            return NetworkId.UNKNOWN;
        }
    } catch (err) {
        logger.error(`Error in globalUtil->getNetworkId2(): ${err}`);
        return NetworkId.UNKNOWN;
    }
};

export {
    calcRangeTimestamps,
    checkDateRange,
    findBlockByDate,
    findBlockByDateAvax,
    getProvider,
    getProviderKey,
    getProviderAvax,
    getNetworkId2,
}
