const { etlGroStats, etlGroStatsHDL } = require('./etl/etlGroStats');
const { etlPriceCheck, etlPriceCheckHDL } = require('./etl/etlPriceCheck');
const { etlPersonalStats } = require('./etl/etlPersonalStats');
const { etlPersonalStatsCache } = require('./etl/etlPersonalStatsCache');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');
const { getPriceCheck } = require('./handler/priceCheckHandler');
const { checkDateRange } = require('./common/globalUtil');
const scheduler = require('./scheduler/dbStatsScheduler');
const { getHistoricalAPY } = require('./handler/historicalAPY');


(async () => {
    try {
        const params = process.argv.slice(2);

        if (params.length > 0) {
            switch (params[0]) {
                case 'priceCheckHDL':
                    if (params.length === 3) {
                        await etlPriceCheckHDL(
                            parseInt(params[1]),    // start timestamp
                            parseInt(params[2]));   // end timestamp
                    } else {
                        console.log('Wrong parameters for Price Check HDL - e.g.: priceCheckHDL 1626825600 1626912000');
                    }
                    break;
                case 'groStatsHDL':
                    if (params.length === 5) {
                        await etlGroStatsHDL(
                            parseInt(params[1]),    // start timestamp
                            parseInt(params[2]),    // end timestamp
                            params[3],              // attribute
                            parseInt(params[4]));   // interval (in seconds)
                    } else {
                        console.log('Wrong parameters for groStats HDL - e.g.: groStats 1626825600 1626912000');
                    }
                    break;
                case 'personalStatsETL':
                    if (params.length === 3 && checkDateRange(params[1], params[2])) {
                        await loadContractInfoFromRegistry();
                        await etlPersonalStats(
                            params[1],              // start date
                            params[2]);             // end date
                    } else {
                        console.log('Wrong parameters for personal stats ETL - e.g.: personalStatsETL 28/06/2021 29/06/2021');
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }

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
        await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();

