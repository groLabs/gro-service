// default key from BOT_ENV in config file => blockchain.alchemy_api_keys.default
import BN from 'bignumber.js';
import moment from 'moment';
import { div } from '../../common/digitalUtil';
const nodeEnv = process.env.NODE_ENV.toLowerCase();
import { showError } from '../handler/logHandler';
import { getConfig } from '../../common/configUtil';
import {
    Base,
    NetworkId,
    NetworkName,
    GlobalNetwork,
    TokenId,
    TokenName,
} from '../types';
import { ICall } from '../interfaces/ICall';
import { QUERY_ERROR } from '../constants';
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
// ETH config
import { getAlchemyRpcProvider } from '../../common/chainUtil';
import BlocksScanner from './blockscanner';
const providerKey = 'default';
const provider = getAlchemyRpcProvider(providerKey);
const scanner = new BlocksScanner(provider);
// AVAX config
import { ethers } from 'ethers';
const rpcURL = 'https://nd-353-879-524.p2pify.com/ext/bc/C/rpc';

const providerAVAX = new ethers.providers.JsonRpcProvider({
    url: rpcURL,
    user: getConfig('blockchain.avax_api_keys.username'),
    password: getConfig('blockchain.avax_api_keys.password'),
});
const scannerAvax = new BlocksScanner(providerAVAX);


const errorObj = (msg: string): ICall => ({
    "status": QUERY_ERROR,
    "data": msg,
});

const isPlural = (count: number) => (count > 1 ? 's' : '');

const parseAmount = (
    amount: any, //TOOD: Bignumber
    base: Base
) => {
    return parseFloat(
        div(
            amount,
            base === Base.D18
                ? new BN(10).pow(18)
                : new BN(10).pow(6),
            amountDecimal,
        )
    );
};

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
        showError('globalUtil.ts->calcRangeTimestamps()', err);
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
                showError(
                    'globalUtil.ts->checkDateRange()',
                    `fromDate ${_fromDate} is after toDate ${_toDate}`
                );
                return false;
            }
        } else {
            showError(
                'globalUtil.ts->checkDateRange()',
                `Incorrect date format (fromDate: ${_fromDate} toDate: ${_toDate})`
            );
            return false;
        }
    } catch (err) {
        showError(
            'globalUtil.ts->checkDateRange()',
            `[fromDate ${_fromDate} toDate ${_toDate}]: ${err}`
        );
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
    try {
        return await scanner.getDate(scanDate.toDate(), after);
    } catch (err) {
        showError(
            'globalUtil.ts->findBlockByDate()',
            `Could not get block for ${scanDate}: ${err}`
        );
        return;
    }
}

///@notice  Same than findBlockByDate() but for Avalanche network
const findBlockByDateAvax = async (scanDate, after) => {
    try {
        return await scannerAvax.getDate(scanDate.toDate(), after);
    } catch (err) {
        showError(
            'globalUtil.ts->findBlockByDateAvax()',
            `Could not get block for ${scanDate}: ${err}`
        );
        return;
    }
}

/// @notice Returns the Alchemy provider based on referring bot key
const getProvider = () => provider;

/// @notice Returns the Alchemy provider key
const getProviderKey = () => providerKey;

/// @notice Returns the Avax provider
const getProviderAvax = () => providerAVAX;

/// @notice Returns the network id & name
const getNetwork = (globalNetwork: GlobalNetwork) => {
    try {
        if (globalNetwork === GlobalNetwork.ETHEREUM) {
            switch (nodeEnv) {
                case NetworkName.MAINNET:
                    return {
                        id: NetworkId.MAINNET,
                        name: NetworkName.MAINNET,
                    }
                case NetworkName.ROPSTEN:
                    return {
                        id: NetworkId.ROPSTEN,
                        name: NetworkName.ROPSTEN,
                    }
                case NetworkName.RINKEBY:
                    return {
                        id: NetworkId.RINKEBY,
                        name: NetworkName.RINKEBY,
                    }
                case NetworkName.GOERLI:
                    return {
                        id: NetworkId.GOERLI,
                        name: NetworkName.GOERLI,
                    }
                default:
                    return {
                        id: NetworkId.UNKNOWN,
                        name: NetworkName.UNKNOWN
                    }
            }
        } else if (globalNetwork === GlobalNetwork.AVALANCHE) {
            return {
                id: NetworkId.AVALANCHE,
                name: NetworkName.AVALANCHE
            }
        } else {
            return {
                id: NetworkId.UNKNOWN,
                name: NetworkName.UNKNOWN
            }
        }
    } catch (err) {
        showError('globalUtil.ts->getNetwork()', err);
        return {
            id: NetworkId.UNKNOWN,
            name: NetworkName.UNKNOWN
        }
    }
}

const getBlockData = async (blockNumber) => {
    const block = await getProvider()
        .getBlock(blockNumber)
        .catch((err) => {
            showError('globalUtil.ts->getBlockData()', err);
            return 0;
        });
    return block;
};

const getBlockDataAvax = async (blockNumber) => {
    const block = await getProviderAvax()
        .getBlock(blockNumber)
        .catch((err) => {
            showError('globalUtil.ts->getBlockDataAvax()', err);
            return 0;
        });
    return block;
};

const getTokenInfoFromAddress = (
    address: string,
): [TokenId, TokenName] => {
    switch (address) {
        case '0x3ADb04E127b9C0a5D36094125669d4603AC52a0c':  // mainnet
        case '0x4394be2135357833A9e18D5A73B2a0C629efE984':  // ropsten
            return [
                TokenId.GVT,
                TokenName.GVT
            ];
        case '0xF0a93d4994B3d98Fb5e3A2F90dBc2d69073Cb86b':  // mainnet
        case '0xCAdC58879f214a47Eb15B3Ac6eCfBdC29fb17F28':  // ropsten
            return [
                TokenId.PWRD,
                TokenName.PWRD
            ];
        case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48':  // mainnet
        case '0xa553CdA420072A759aC352DCa4CeC70709829614':  // ropsten
            return [
                TokenId.USDC,
                TokenName.USDC
            ];
        case '0xdAC17F958D2ee523a2206206994597C13D831ec7':  // mainnet
        case '0xed395510B7a2299f8049bcAcb6e9157213115564':  // ropsten
            return [
                TokenId.USDT,
                TokenName.USDT
            ];
        case '0x6B175474E89094C44Da98b954EedeAC495271d0F':  // mainnet
        case '0xBad346b9d0f4272DB9B01AA6F16761115B851277':  // ropsten
            return [
                TokenId.DAI,
                TokenName.DAI
            ];
        case '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664':
            return [
                TokenId.groUSDC_e,
                TokenName.groUSDC_e,
            ];
        case '0xc7198437980c041c805A1EDcbA50c1Ce5db95118':
            return [
                TokenId.groUSDT_e,
                TokenName.groUSDT_e,
            ];
        case '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70':
            return [
                TokenId.groDAI_e,
                TokenName.groDAI_e,
            ];
        default:
            showError(
                'globalUtil.ts->getTokenInfoFromAddress()',
                'Unknown token address');
            return [
                TokenId.UNKNOWN,
                TokenName.UNKNOWN
            ];
    }
}

export {
    errorObj,
    isPlural,
    calcRangeTimestamps,
    checkDateRange,
    findBlockByDate,
    findBlockByDateAvax,
    parseAmount,
    getNetwork,
    getProvider,
    getProviderKey,
    getProviderAvax,
    getBlockData,
    getBlockDataAvax,
    getTokenInfoFromAddress,
}
