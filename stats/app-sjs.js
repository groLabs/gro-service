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
const {getBalancerGroWethStats } = require('./handler/groTokenHandler');
const { BigNumber: BN } = require('bignumber.js');

function printUsd(value) {
    return BN(value.toString())
        .div(BN(10).pow(BN(18)))
        .toFixed(7)
        .toString();
}


// (async () => {
//     try {
//         const params = process.argv.slice(2);

//         // Testing groStats
//         // await etlGroStats();
//         // await etlGroStatsHDL(1623844800,1623844800,'apy',1800);

//         // Testing priceCheck
//         // await etlPriceCheck();
//         // console.log(await getPriceCheck());
//         // await etlPriceCheckHDL(1626825600, 16269120001);

//         // Testing Historical APY
//         // const attr = 'apy_last7d,apy_last7d,apy_last7d';
//         // const freq = 'twice_daily,daily,weekly';
//         // const start = '1625097600,1625097600,1625097600';
//         // const end = '1629936000,1629936000,1629936000';
//         // const attr = 'apy_last7d';
//         // const freq = 'daily';
//         // const start = 1625097600;
//         // const end = 1629936000;
//         // const end = 16299;
//         // const res = await getHistoricalAPY(attr, freq, start, end);
//         // console.log(res);

//         // Testing personal stats cache
//         // const b = await getBalancerGroWethStats('x');
//         // console.log(b);

//         const ONE = BigNumber.from('1000000000000000000');
//         // const a = BN.from('3333');
//         // const b = a.mul(ONE);
//         // console.log(b.toString());

//         const lp =  39.83591412162086

//         const b1 = lp.toFixed(0).toString();
//         console.log('b1', b1);
//         const c = BigNumber.from(b1).mul(ONE);
//         console.log(c.toString());

//         process.exit(0);
//     } catch (err) {
//         console.log(err);
//     }
// })();

loadContractInfoFromRegistry().then(async () => {
        await getBalancerGroWethStats('x');
});

