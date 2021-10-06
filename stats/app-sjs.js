require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const actuator = require('express-actuator');

const {
    SettingError,
    ParameterError,
    ContractCallError,
} = require('../common/error');
const {
    sendMessage,
    DISCORD_CHANNELS,
} = require('../common/discord/discordService');
const customLogger = require('./statsLogger');

const { ethers, BigNumber } = require('ethers');
const statsRouter = require('./routes/stats');
const scheduler = require('./scheduler/statsScheduler');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');
const { sendAlertMessage } = require('../common/alertMessageSender');
const { contractCallFailedCount } = require('./common/contractStorage');
const { getConfig } = require('../common/configUtil');

const failedAlertTimes = getConfig('call_failed_time', false) || 3;
const { getBalancerGroWethStats } = require('./handler/groTokenHandler');
const { BigNumber: BN } = require('bignumber.js');

const ONE = BigNumber.from('1000000000000000000');

function printUsd(value) {
    return BN(value.toString())
        .div(BN(10).pow(BN(18)))
        .toFixed(7)
        .toString();
}

function formatNumber(originalNumber, decimal, fixed) {
    const tempNum = BN(originalNumber.toString()).div(BN(10).pow(decimal));
    return tempNum.toFormat(fixed);
}

var countDecimals = (value) => {
    if (Math.floor(value) !== value)
        return value.toString().split(".")[1].length || 0;
    return 0;
}

/// @notice Converts a float (with decimals) into BigNumber in weis (10exp18)
///         E.g.: given 34.560, it will return 34560000000000000000
/// @dev    The decimals are trimmed to 10 digits to avoid 'invalid BigNumber string' error
/// @param _value The float to be converted
/// @return BigNumber in weis
const floatToBN = (_value) => {
    try {
        if (isNaN(_value)) {
            return BigNumber.from('0');
        } else {
            const value = parseFloat(_value);
            if (Math.trunc(value) !== value) {
                const integer = Math.trunc(value);
                const decimals = value.toFixed(10).split(".")[1];
                const countDecimals = decimals.length || 0;
                const result =
                    BigNumber.from(integer.toString() + decimals)
                        .mul(ONE)
                        .div(BigNumber.from('10').pow(countDecimals.toString()));
                return result;
            } else {
                const result = BigNumber.from(value.toString())
                    .mul(ONE);
                return result;
            }
        }
    } catch (err) {
        logger.error('Error at ...', err);
        return BigNumber.from('0');
    }
}

/*
(async () => {
    try {
        const params = process.argv.slice(2);

        // Testing groStats
        // await etlGroStats();
        // await etlGroStatsHDL(1623844800,1623844800,'apy',1800);

        // Testing priceCheck
        // await etlPriceCheck();
        // console.log(await getPriceCheck());
        // await etlPriceCheckHDL(1626825600, 16269120001);

        // Testing Historical APY
        // const attr = 'apy_last7d,apy_last7d,apy_last7d';
        // const freq = 'twice_daily,daily,weekly';
        // const start = '1625097600,1625097600,1625097600';
        // const end = '1629936000,1629936000,1629936000';
        // const attr = 'apy_last7d';
        // const freq = 'daily';
        // const start = 1625097600;
        // const end = 1629936000;
        // const end = 16299;
        // const res = await getHistoricalAPY(attr, freq, start, end);
        // console.log(res);

        // Testing personal stats cache

        const BIG = BigNumber.from('13158599529592910625168604');

        const a = BIG.div(ONE);
        console.log(a.toString());
        console.log(printUsd(BIG));

        const b = floatToBN('34.560');
        console.log(b.toString());
        console.log(printUsd(b));


        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();
*/

loadContractInfoFromRegistry().then(async () => {
        await getBalancerGroWethStats('x');
        process.exit(0);
});

