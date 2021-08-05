// const { loadGroStatsDB } = require('./loader/personalLoader');
// const { loadGroStatsLiveDB } = require('./loader/personalLiveLoader');

const { etlGroStats } = require('./etl/etlGroStats');
const { etlPriceCheck } = require('./etl/etlPriceCheck');
// const { groStatsHandler } = require('./handler/groStatsHandler');
const { getPriceCheck } = require('./handler/priceCheckHandler');
const scheduler = require('./scheduler/dbStatsScheduler');
const { getHistoricalAPY } = require('./handler/historicalAPY');


// *** TESTING ***
(async () => {
    try {
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

        const res = await getHistoricalAPY(attr, freq, start, end);
        console.log(res);
        //console.log(res.historical_stats.last7d_apy.results, res.historical_stats.last_month_apy.results, res.historical_stats.all_time_apy.results);
        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();
//loadGroStatsDB();
//loadGroStatsLiveDB('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//groStatsHandler();
//goPrice();






/*
npm i pg
MODE_ENV=kovan BOT_ENV=STATS node ./stats_db/app.js
*/
