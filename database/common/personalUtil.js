const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const {
    initDatabaseContracts,
    initAllContracts,
    getGvt,
    getPwrd,
    getBuoy,
    getDepositHandler,
    getVaultStabeCoins,
} = require('../../contract/allContracts');

const isPlural = (count) => (count > 1) ? 's' : '';

const handleErr = async (func, err) => {
    logger.error(`**DB: ${func} \n Message: ${err}`);
}

const Transfer = Object.freeze({
    "DEPOSIT": 1,
    "WITHDRAWAL": 2,
    "EXTERNAL_GVT_DEPOSIT": 3,
    "EXTERNAL_PWRD_DEPOSIT": 4,
    "EXTERNAL_GVT_WITHDRAWAL": 5,
    "EXTERNAL_PWRD_WITHDRAWAL": 6,
    "STABLECOIN_APPROVAL": 7,
});

const transferType = (side) => {
    switch (side) {
        case Transfer.DEPOSIT:
            return 'deposit';
        case Transfer.WITHDRAWAL:
            return 'withdrawal';
        case Transfer.EXTERNAL_GVT_DEPOSIT:
            return 'ext_gvt_deposit';
        case Transfer.EXTERNAL_PWRD_DEPOSIT:
            return 'ext_pwrd_deposit';
        case Transfer.EXTERNAL_GVT_WITHDRAWAL:
            return 'ext_gvt_withdrawal';
        case Transfer.EXTERNAL_PWRD_WITHDRAWAL:
            return 'ext_pwrd_withdrawal';
        case Transfer.STABLECOIN_APPROVAL:
            return 'coin-approve';
        default:
            break;
    }
}

const isDeposit = (side) => {
    return (side === Transfer.DEPOSIT
        || side === Transfer.EXTERNAL_GVT_DEPOSIT
        || side === Transfer.EXTERNAL_PWRD_DEPOSIT)
        ? true
        : false;
}

const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet': return 1;
            case 'ropsten': return 3;
            case 'kovan': return 42;
            //case 'develop': return TBC;
            //otherwise, raise exception
        }
        return -1;
    } catch (err) {
        logger.error(err);
    }
}

// DUPLICATED: to be moved to /common
function getStableCoinIndex(tokenSymbol) {
    switch (tokenSymbol) {
        case 'DAI':
            return 0;
        case 'USDC':
            return 1;
        case 'USDT':
            return 2;
        default:
            //throw new ParameterError(`Not found token symbo: ${tokenSymbol}`);
            // TODO
            return -1;
    }
}

/// @notice Generates a collection of dates from a given start date to an end date
/// @param _fromDate Start date
/// @param _toDdate End date
/// @return An array with all dates from the start to the end date
const generateDateRange = (_fromDate, _toDate) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            logger.info('**DB: Date format is incorrect: should be "DD/MM/YYYY');
            return;
        }
        // Build array of dates
        const fromDate = moment.utc(_fromDate, "DD/MM/YYYY");
        const toDate = moment.utc(_toDate, "DD/MM/YYYY");
        const days = toDate.diff(fromDate, 'days');
        let dates = [];
        let day;
        if (days >= 0) {
            for (let i = 0; i <= days; i++) {
                day = fromDate.clone().add(i, 'days');
                dates.push(day);
            }
        }
        return dates;
    } catch (err) {
        handleErr(`personalHandler->generateDateRange() [from: ${_fromDate}, to: ${_toDate}]`, err);
    }
}

module.exports = {
    getNetworkId,
    getStableCoinIndex,
    generateDateRange,
    handleErr,
    isDeposit,
    isPlural,
    Transfer,
    transferType,
}
