// const { loadGroStatsDB } = require('./loader/personalLoader');
// const { loadGroStatsLiveDB } = require('./loader/personalLiveLoader');
const { etlGroStats } = require('./etl/etlGroStats');
const { etlPriceCheck, etlPriceCheckHDL } = require('./etl/etlPriceCheck');
// const { groStatsHandler } = require('./handler/groStatsHandler');
const { getPriceCheck } = require('./handler/priceCheckHandler');
const scheduler = require('./scheduler/dbStatsScheduler');
const { getHistoricalAPY } = require('./handler/historicalAPY');


// *** TESTING ***
(async () => {
    try {
        const params = process.argv.slice(2);

        if (params.length > 0) {
            switch (params[0]) {
                case 'priceCheckHDL':
                    if (params.length === 3) {
                        await etlPriceCheckHDL(parseInt(params[1]), parseInt(params[2]));
                    } else {
                        console.log('Wrong parameters for Price Check HDL - e.g.: priceCheckHDL 1626825600 1626912000');
                    }
                    break;
                default:
                    break;
            }
            process.exit(0);
        }

        // await etlGroStats();
        // await etlPriceCheck();
        // console.log(await getPriceCheck());

        // Testing Historical APY
        const attr = 'apy_last7d,apy_last7d,apy_last7d';
        const freq = 'twice_daily,daily,weekly';
        const start = '1625097600,1625097600,1625097600';
        const end = '1629936000,1629936000,1629936000';
        // const attr = 'apy_last7d';
        // const freq = 'daily';
        // const start = 1625097600;
        // const end = 1629936000;
        // const end = 16299;
        // const res = await getHistoricalAPY(attr, freq, start, end);
        // console.log(res);

        // Testing Price Check reload
        // console.log('hola')
        // await etlPriceCheckHDL(1626825600, 16269120001);
        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();
